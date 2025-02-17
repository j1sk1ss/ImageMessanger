import hmac
import hashlib
import base64

from common.configuration import conf


temp_keys_list: list = []


def _load_keys() -> set:
    try:
        with open(conf.PASSWORDS_FILE, "r") as f:
            return set(line.strip() for line in f.readlines())
    except FileNotFoundError:
        return set()
    

def verify_pass(password: str) -> tuple:
    passwords: set[str] = _load_keys()
    for pswd in passwords:
        if password == pswd.split(" ")[0]:
            return pswd.split(" ", 2)
    
    return None, None


def generate_access_key(username: str, userpass: str) -> str:
    data = f"{username}:{userpass}".encode()
    key = hmac.new("сщквуддЫфде".encode(), data, hashlib.sha256).digest()
    access_key = base64.urlsafe_b64encode(key).decode()
    temp_keys_list.append(access_key)
    return access_key


def verify_access_key(key: str) -> bool:
    return key in temp_keys_list
