import json


def _load_contacts(filename="contacts.json"):
    try:
        with open(filename, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []


def _save_contacts(contacts, filename="contacts.json"):
    with open(filename, "w") as file:
        json.dump(contacts, file, indent=4)


def add_contact(username, contact, filename="contacts.json") -> bool:
    contacts = _load_contacts(filename)
    for user in contacts:
        if user["username"] == username:
            if contact not in user["contacts"]:
                user["contacts"].append(contact)
                _save_contacts(contacts, filename)
                return True
            else:
                return False
    
    new_user = {
        "username": username,
        "contacts": [contact]
    }

    contacts.append(new_user)
    _save_contacts(contacts, filename)
    return True


def remove_contact(username, contact, filename="contacts.json") -> bool:
    contacts = _load_contacts(filename)
    for user in contacts:
        if user["username"] == username:
            if contact in user["contacts"]:
                user["contacts"].remove(contact)
                _save_contacts(contacts, filename)
                return True
            else:
                return False
    
    return False


def get_contacts(username, filename="contacts.json"):
    contacts = _load_contacts(filename)
    for user in contacts:
        if user["username"] == username:
            return user["contacts"]
    
    return []
