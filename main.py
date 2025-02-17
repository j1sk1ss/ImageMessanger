import os
import time
import tempfile

from common.configuration import conf
from common.messages import (
    save_message,
    load_messages
)

from common.contacts import (
    get_contacts,
    remove_contact,
    add_contact
)

from common.auth import (
    verify_pass,
    generate_access_key,
    verify_access_key,
    add_key
)

from flask_cors import CORS
from flask_socketio import SocketIO
from flask import (
    Flask, 
    jsonify, 
    render_template, 
    request,
    send_from_directory
)

# region Setup

app = Flask(__name__, static_folder='static', template_folder='static')
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024 * 1024
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app=app)


def require_authorization(f):
    def wrapper(*args, **kwargs):
        auth_key = request.headers.get("Authorization")
        if not verify_access_key(auth_key):
            return jsonify({"error": "Unauthorized"}), 403
        
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# endregion

# region Main

@app.route('/')
def _index():
    return render_template("index.html")


@app.route('/auth', methods=['POST'])
def _auth_user():
    data: dict = request.json
    if not data:
        return 400, "No data provided"
    
    username: str | None = data.get("username", None)
    password: str | None = data.get("password", None)
    if not username or not password:
        return 400, "Password and username not provided"
    
    login_data: tuple = verify_pass(username=username, password=password)
    if not login_data[0] or not login_data[1]:
        return 404, "User not found"
    
    return {
        "username": login_data[1],
        "key": generate_access_key(username=login_data[1], userpass=login_data[0])
    }


@app.route('/register', methods=['POST'])
def _register_user():
    data: dict = request.json
    if not data:
        return 400, "No data provided"
    
    username: str | None = data.get("username", None)
    password: str | None = data.get("password", None)
    if not username or not password:
        return 400, "Password and username not provided"
    
    if add_key(username=username, password=password):
        return {
            "username": username,
            "key": generate_access_key(username=username, userpass=password)
        }
    else:
        return "Error", 500

# endregion

# region Contacts

@app.route('/contacts', methods=['GET'])
@require_authorization
def _get_contacts_list():
    username: str = request.headers.get("X-Username")
    return jsonify({"contacts": get_contacts(username=username)})


@app.route('/contacts', methods=['POST'])
@require_authorization
def _add_contact():
    username: str = request.headers.get("X-Username")
    new_contact: str = request.json["contact"]
    if add_contact(username=username, contact=new_contact):
        return "Add success", 200
    else:
        return "Add error", 500


@app.route('/contacts', methods=['DELETE'])
@require_authorization
def _remove_contact():
    username: str = request.headers.get("X-Username")
    contact: str = request.json["contact"]
    if remove_contact(username=username, contact=contact):
        return "Delete success", 200
    else:
        return "Delete error", 500

# endregion

# region Messages

@app.route('/messages', methods=['POST'])
@require_authorization
def _send_message():
    encrypted_message = request.form['message']
    sender = request.form['sender']
    receivers = request.form['receiver'].split(",")
    timestamp = time.time()

    chat_id = ",".join(sorted([sender] + receivers))
    image_url = None
    if 'file' in request.files:
        file = request.files['file']
        if file:
            filename = f"{int(timestamp)}_{tempfile.gettempprefix()}"
            filepath = os.path.join(conf.FILES_DIR, filename)
            file.save(filepath)
            image_url = filepath

    send_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))
    message_data = {
        'from': sender,
        'message': encrypted_message,
        'time': send_time,
        'image': image_url
    }

    save_message(chat_id, message_data)
    return jsonify({"message": "Message sent successfully", "time": send_time})


@app.route('/messages', methods=['GET'])
@require_authorization
def _get_messages():
    source_chat = request.args.get('sender').split(",")
    user_name = request.args.get('receiver')
    offset = request.args.get('offset')
    limit = request.args.get('limit', default=20, type=int)

    if not user_name:
        return jsonify({"error": "Receiver name is required"}), 400

    chat_id = ",".join(sorted([user_name] + source_chat))
    return jsonify({ "messages": load_messages(chat_id, offset, limit) })


@app.route('/uploads/<filename>')
def _send_image(filename: str):
    return send_from_directory(conf.FILES_DIR, filename)

# endregion

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
