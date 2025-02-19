import { encryptMessage, decryptMessage, encryptImage, decryptImage } from './utils/crypto.js';
import { fetchMessages, displayMessage } from './utils/common.js';


let socket = null;


function connectToSocket() {
    socket = io();
    socket.on('connect', function() {
        console.log("WebSocket connected");
        socket.emit('join', {
            username: localStorage.getItem("username")
        });
    });

    socket.on('new_message', async function(data) {
        const receiver = document.getElementById('chatTitle').textContent;
        if (receiver !== data.from) return;
    
        const encryptionKey = document.getElementById('encryptKeyInput').value;
        let msg = "";
        if (data.message) {
            msg = decryptMessage(data.message, encryptionKey);
        }
    
        let imageFile = null;
        if (data.image) {
            try {
                const imageResponse  = await fetch(data.image);
                const encryptedImage = await imageResponse.text();
                imageFile = decryptImage(encryptedImage, encryptionKey);
            } catch (error) {
                console.error("Ошибка при загрузке изображения", error);
            }
        }
    
        displayMessage(data.from, msg, data.time, imageFile);
    });    

    socket.on('new_contact', function(data) {
        console.log("New contact:", data.contact);
        loadContacts();
    });

    socket.on('disconnect', function() {
        console.log("WebSocket disabled");
    });
}


window.auth = async function () {
    const loginScreen        = document.getElementById("loginScreen");
    const messengerContainer = document.getElementById("messengerContainer");
    const usernameInput      = document.getElementById("username");
    const username           = usernameInput.value.trim();
    const passwordInput      = document.getElementById("password");
    const password           = passwordInput.value.trim();
    if (password === "" || username === "") {
        return;
    }

    try {
        const response = await fetch("/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password:password, username:username })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Auth error");
        }

        const access_key = data.key;
        localStorage.setItem("username", username);
        localStorage.setItem("access_key", access_key);

        loginScreen.style.display = "none";
        messengerContainer.style.display = "flex";

        loadContacts();
        connectToSocket();
    } catch (error) {
        alert(error.message);
    }
}


window.register = async function () {
    const loginScreen        = document.getElementById("loginScreen");
    const messengerContainer = document.getElementById("messengerContainer");
    const usernameInput      = document.getElementById("username");
    const username           = usernameInput.value.trim();
    const passwordInput      = document.getElementById("password");
    const password           = passwordInput.value.trim();
    if (password === "" || username === "") {
        return;
    }

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password:password, username:username })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Register error");
        }

        const access_key = data.key;
        localStorage.setItem("username", username);
        localStorage.setItem("access_key", access_key);

        loginScreen.style.display = "none";
        messengerContainer.style.display = "flex";

        loadContacts();
        connectToSocket();
    } catch (error) {
        alert(error.message);
    }
}


function sendMessage(receiver, message, file = null) {
    const data = {
        sender: localStorage.getItem("username"),
        receiver: receiver,
        message: message,
        image: null
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = function() {
            const formData = new FormData();
            formData.append('file', file);

            fetch('/uploads', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(respData => {
                if (respData.file_path) {
                    data.image = respData.file_path;
                    socket.emit('send_message', data);
                } else {
                    console.log("Loading error");
                }
            })
            .catch(error => {
                console.error(error);
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        socket.emit('send_message', data);
    }
}


async function loadContacts() {
    const username  = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");
    if (!username || !accessKey) {
        return;
    }

    try {
        const response = await fetch("/contacts", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": accessKey,
                "X-Username": username
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Load contacts error");
        }

        const contactsList = document.getElementById("contactsList");
        contactsList.innerHTML = "";

        data.contacts.forEach(contact => {
            const li = document.createElement("li");

            li.classList.add("contact");
            li.textContent = contact;
            li.onclick = () => openChat(contact);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                removeContact(contact);
            };

            li.appendChild(deleteButton);
            contactsList.appendChild(li);
        });

    } catch (error) {
        alert(error.message);
    }
}


window.addContact = async function () {
    const contact   = document.getElementById("newContactNickname").value;
    const username  = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");
    if (!contact) {
        return;
    }

    try {
        const response = await fetch("/contacts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": accessKey,
                "X-Username": username
            },
            body: JSON.stringify({ contact })
        });

        if (!response.ok) {
            throw new Error(response.message || "Add contact error");
        }

        loadContacts();
        closeAddContactInterface();

    } catch (error) {
        alert(error.message);
    }
}


async function removeContact(contact) {
    const username  = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");

    if (!contact) {
        alert("Empty nickname.");
        return;
    }

    try {
        const response = await fetch("/contacts", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": accessKey,
                "X-Username": username
            },
            body: JSON.stringify({ contact })
        });

        if (!response.ok) {
            throw new Error(response.message || "Delete contact error.");
        }

        loadContacts();
    } catch (error) {
        alert(error.message);
    }
}


let page = 0;


async function openChat(contact) {
    document.getElementById("chatTitle").textContent = contact;
    const chatMessages = document.getElementById("chatMessages");
    const chat = document.getElementById("chatSection");
    chat.style.display = "block";
    
    page = 0;
    const images = chatMessages.getElementsByTagName('img');
    for (let image of images) {
        URL.revokeObjectURL(image.src);
    }
    
    chatMessages.innerHTML = "";
    fetchMessages(page);
}


window.nextPage = async function () {
    const chatMessages = document.getElementById('chatMessages');
    const images = chatMessages.getElementsByTagName('img');
    for (let image of images) {
        URL.revokeObjectURL(image.src); 
    }

    page++;
    chatMessages.innerHTML = "";
    fetchMessages(page);
}


window.prevPage = async function () {
    if (page > 0) {
        const chatMessages = document.getElementById('chatMessages');
        const images = chatMessages.getElementsByTagName('img');
        for (let image of images) {
            URL.revokeObjectURL(image.src);
        }

        page--;
        chatMessages.innerHTML = "";
        fetchMessages(page);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('sendMessageButton').addEventListener('click', async function() {
        const message          = document.getElementById('messageInput').value;
        const receiver         = document.getElementById('chatTitle').textContent;
        const encryptionKey    = document.getElementById('encryptKeyInput').value; 
        const encryptedMessage = encryptMessage(message, encryptionKey);
        const fileInput        = document.getElementById('imageInput');
        const fileData         = fileInput.files[0];
        
        let encryptedImage = null;
        if (fileData) {
            encryptedImage = await encryptImage(fileData, encryptionKey);
            const imageBlob = new Blob([encryptedImage], { type: 'image/jpeg' });
            encryptedImage = new File([imageBlob], "encrypted_image.jpg");
        }
    
        sendMessage(receiver, encryptedMessage, encryptedImage);
        displayMessage(localStorage.getItem("username"), document.getElementById('messageInput').value, null, fileData);
        document.getElementById('messageInput').value = "";
        
        fileInput.value = '';
        document.getElementById('imagePreview').style.display = "none";
        document.getElementById("fileNameLabel").textContent = "Attachment";
    });

    document.getElementById("imageInput").addEventListener("change", function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imagePreview = document.getElementById("imagePreview");
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
            const fileName = file.name;
            document.getElementById("fileNameLabel").textContent = fileName;
        } else {
            document.getElementById("imagePreview").style.display = "none";
            document.getElementById("fileNameLabel").textContent = "Attachment";
        }
    });
});
