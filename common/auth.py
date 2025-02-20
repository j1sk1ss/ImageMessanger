import os
import hmac
import base64
import hashlib

from common.configuration import conf


temp_keys_list: list = []


def _load_keys() -> set:
    try:
        with open(conf.PASSWORDS_FILE, "r") as f:
            return set(line.strip() for line in f.readlines())
    except FileNotFoundError:
        return set()
    

def give_name_by_phone(phone: str) -> str | None:
    entries: set = _load_keys()
    for entry in entries:
        _, name, _phone = entry.split(":")
        if _phone == phone:
            return name

    return None


def user_exists(username: str | None, phone: str | None) -> int:
    entries: set = _load_keys()
    for entry in entries:
        _, name, _phone = entry.split(":")
        if name == username:
            return 1
        if _phone == phone:
            return 2

    return 0


def add_key(username: str, password: str, phone: str) -> bool:
    keys = set()
    if os.path.exists(conf.PASSWORDS_FILE):
        with open(conf.PASSWORDS_FILE, "r") as f:
            keys = set(line.strip() for line in f if line.strip())

    new_entry = f"{_get_hash(password)}:{username}:{phone}"
    if new_entry in keys:
        return False

    keys.add(new_entry)
    with open(conf.PASSWORDS_FILE, "w") as f:
        f.write("\n".join(keys) + "\n")

    return True


def verify_pass(username: str, password: str) -> tuple:
    passwords: set[str] = _load_keys()
    for pswd in passwords:
        if _get_hash(password) == pswd.split(":")[0] and username == pswd.split(":")[1]:
            return pswd.split(":", 2)
    
    return None, None


def generate_access_key(username: str, userpass: str) -> str:
    access_key = _get_hash(f"{username}:{userpass}")
    temp_keys_list.append(access_key)
    return access_key


def _get_hash(userpass: str) -> str:
    data = userpass.encode()
    key = hmac.new("сщквуддЫфде".encode(), data, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(key).decode().replace(":", "")


def verify_access_key(key: str) -> bool:
    return key in temp_keys_list
