import json

from common.configuration import conf
from common.auth import user_exists, give_name_by_phone


def _load_contacts():
    try:
        with open(conf.CONTACTS_FILE, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []


def _save_contacts(contacts):
    with open(conf.CONTACTS_FILE, "w") as file:
        json.dump(contacts, file, indent=4)


def add_contact(username: str, contact: str) -> bool:
    contact_res: int = user_exists(contact, contact)
    if contact_res == 0:
        return False
    
    if contact_res == 2:
        contact = give_name_by_phone(contact)

    contacts = _load_contacts()
    for user in contacts:
        if user["username"] == username:
            if contact not in user["contacts"]:
                user["contacts"].append(contact)
                _save_contacts(contacts)
                return True
            else:
                return False
    
    new_user = {
        "username": username,
        "contacts": [contact]
    }

    contacts.append(new_user)
    _save_contacts(contacts)
    return True


def remove_contact(username, contact) -> bool:
    contacts = _load_contacts()
    for user in contacts:
        if user["username"] == username:
            if contact in user["contacts"]:
                user["contacts"].remove(contact)
                _save_contacts(contacts)
                return True
            else:
                return False
    
    return False


def get_contacts(username):
    contacts = _load_contacts()
    for user in contacts:
        if user["username"] == username:
            return user["contacts"]
    
    return []
