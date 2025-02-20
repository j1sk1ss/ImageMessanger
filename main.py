import os
import time
import uuid

from werkzeug.utils import secure_filename
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
from flask_socketio import (
    SocketIO, 
    emit, 
    join_room
)

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


# region Sockets

users: dict = {} 
chats: dict = {}

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")


@socketio.on('join')
def handle_join(data):
    username = data['username']
    users[username] = request.sid
    join_room(request.sid)
    print(f"{username} connected to {request.sid}")


@socketio.on('disconnect')
def handle_disconnect():
    print(f"Cliend disconnected: {request.sid}")
    global users
    users = {user: sid for user, sid in users.items() if sid != request.sid} 

# endregion


# region Main

@app.route('/')
def _index():
    return render_template("index.html")


@app.route('/auth', methods=['POST'])
def _auth_user():
    data: dict = request.json
    if not data:
        return "No data provided", 400
    
    username: str | None = data.get("username", None)
    password: str | None = data.get("password", None)
    if not username or not password:
        return "Password and username not provided", 400
    
    login_data: tuple = verify_pass(username=username, password=password)
    if not login_data[0] or not login_data[1]:
        return "User not found", 404
    
    return {
        "username": login_data[1],
        "key": generate_access_key(username=username, userpass=password)
    }


@app.route('/register', methods=['POST'])
def _register_user():
    data: dict = request.json
    if not data:
        return 400, "No data provided"
    
    username: str | None = data.get("username", None)
    password: str | None = data.get("password", None)
    phone: str | None = data.get("phone", None)
    if not username or not password or not phone:
        return 400, "Password and username not provided"
    
    if add_key(username=username, password=password, phone=phone):
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
        if add_contact(username=new_contact, contact=username):
            if new_contact in users:
                print(users, new_contact)
                socketio.emit('new_contact', {'contact': username}, room=users[new_contact])

            return "Add success", 200
    
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

@socketio.on('send_message')
def handle_send_message(data: dict):
    print(data)
    sender = data.get("sender")
    receivers = data.get("receiver", "").split(",")

    chat_id = ",".join(sorted([sender] + receivers))
    message_data = {
        'from': sender,
        'message': data['message'],
        'time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time())),
        'image': data.get("image", None),
        'read': False
    }

    save_message(chat_id, message_data)
    for receiver in receivers:
        if receiver in users:
            emit('new_message', message_data, room=users[receiver])


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
    messages, has_next = load_messages(chat_id, offset, limit)
    return jsonify({ "messages": messages, "has_next": has_next })


@app.route('/uploads', methods=['POST'])
def _save_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    unique_filename = str(uuid.uuid4()) + os.path.splitext(filename)[1]
    file_path = os.path.join('static\\data\\uploads', unique_filename)

    file.save(file_path)
    return jsonify({'file_path': file_path}), 200


@app.route('/uploads/<filename>', methods=['GET'])
def _send_image(filename: str):
    return send_from_directory(conf.FILES_DIR, filename)

# endregion


if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
