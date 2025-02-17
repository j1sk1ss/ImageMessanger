import { encryptMessage, decryptMessage, encryptImage, decryptImage } from './utils/crypto.js';
import { formatTime } from './utils/date.js';


window.auth = async function () {
    const loginScreen = document.getElementById("loginScreen");
    const messengerContainer = document.getElementById("messengerContainer");
    const usernameInput = document.getElementById("username");
    const username = usernameInput.value.trim();
    const passwordInput = document.getElementById("password");
    const password = passwordInput.value.trim();
    if (password === "" || username === "") {
        alert("Введите пароль и имя!");
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
            throw new Error(data.message || "Ошибка авторизации");
        }

        const access_key = data.key;
        localStorage.setItem("username", username);
        localStorage.setItem("access_key", access_key);

        loginScreen.style.display = "none";
        messengerContainer.style.display = "flex";

        loadContacts();
    } catch (error) {
        alert(error.message);
    }
}


window.register = async function () {
    const loginScreen = document.getElementById("loginScreen");
    const messengerContainer = document.getElementById("messengerContainer");
    const usernameInput = document.getElementById("username");
    const username = usernameInput.value.trim();
    const passwordInput = document.getElementById("password");
    const password = passwordInput.value.trim();
    if (password === "" || username === "") {
        alert("Введите пароль и имя!");
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
            throw new Error(data.message || "Ошибка авторизации");
        }

        const access_key = data.key;
        localStorage.setItem("username", username);
        localStorage.setItem("access_key", access_key);

        loginScreen.style.display = "none";
        messengerContainer.style.display = "flex";

        loadContacts();
    } catch (error) {
        alert(error.message);
    }
}


async function loadContacts() {
    const username = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");
    if (!username || !accessKey) {
        alert("Ошибка: отсутствуют данные авторизации.");
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
            throw new Error(data.message || "Ошибка загрузки контактов");
        }

        const contactsList = document.getElementById("contactsList");
        contactsList.innerHTML = "";

        data.contacts.forEach(contact => {
            const li = document.createElement("li");

            li.classList.add("contact");
            li.textContent = contact;
            li.onclick = () => openChat(contact);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Удалить';
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
    const contact = document.getElementById("newContactNickname").value;
    const username = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");

    if (!contact) {
        alert("Никнейм не может быть пустым.");
        return;
    }

    if (!username || !accessKey) {
        alert("Ошибка: отсутствуют данные авторизации.");
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
            throw new Error(response.message || "Ошибка добавления контакта");
        }

        loadContacts();
        closeAddContactInterface();

    } catch (error) {
        alert(error.message);
    }
}


async function removeContact(contact) {
    const username = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");

    if (!contact) {
        alert("Ошибка: отсутствует никнейм контакта.");
        return;
    }

    if (!username || !accessKey) {
        alert("Ошибка: отсутствуют данные авторизации.");
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
            throw new Error(response.message || "Ошибка удаления контакта");
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
    fetchMessages();
}


window.nextPage = async function () {
    const images = chatMessages.getElementsByTagName('img');
    for (let image of images) {
        URL.revokeObjectURL(image.src); 
    }

    page++;
    chatMessages.innerHTML = "";
    fetchMessages();
}


window.prevPage = async function () {
    if (page > 0) {
        const images = chatMessages.getElementsByTagName('img');
        for (let image of images) {
            URL.revokeObjectURL(image.src);
        }

        page--;
        chatMessages.innerHTML = "";
        fetchMessages();
    }
}


async function fetchMessages() {
    const accessKey = localStorage.getItem("access_key");
    const encryptionKey = document.getElementById('encryptKeyInput').value;
    const sender = document.getElementById('chatTitle').textContent;
    const user = localStorage.getItem("username");

    try {
        const response = await fetch(
            `/messages?receiver=${user}&sender=${sender}&offset=${7 * page}&limit=7`, 
            {
                method: 'GET',
                headers: {
                    "Authorization": accessKey
                }
            }
        );
        
        const data = await response.json();
        for (const message of data.messages) {
            const messageId = `${message.from}-${message.time}`;
            if (document.getElementById(messageId)) {
                continue;
            }

            let imageFile = null;
            let msg = "";

            if (message.message) {
                msg = decryptMessage(message.message, encryptionKey);
            }

            if (message.image) {
                try {
                    const imageResponse = await fetch(message.image);
                    const encryptedImage = await imageResponse.text();
                    const decryptedBlob = decryptImage(encryptedImage, encryptionKey);
                    if (decryptedBlob) {
                        imageFile = decryptedBlob;
                    } else {
                        console.error("Ошибка при дешифровке изображения");
                    }
                } catch (error) {
                    console.error("Ошибка при загрузке изображения:", error);
                }
            }

            displayMessage(messageId, message.from, msg, message.time, imageFile);
        }
    } catch (error) {
        console.error("Ошибка при загрузке сообщений:", error);
    }
}


function displayMessage(messageId, sender, encryptedMessage, time, imageData) {
    const chatMessages = document.getElementById('chatMessages');
    const messageContainer = document.createElement('div');
    messageContainer.id = messageId;
    messageContainer.classList.add('message');

    const header = document.createElement('div');
    header.classList.add('message-header');
    header.innerHTML = `<strong>${sender}</strong> <span>${formatTime(time)}</span>`;
    messageContainer.appendChild(header);

    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.textContent = encryptedMessage;
    messageContainer.appendChild(messageText);

    if (imageData) {
        const messageImage = document.createElement('img');
        messageImage.src = URL.createObjectURL(imageData);
        messageImage.classList.add('message-image');
        messageContainer.appendChild(messageImage);
        messageImage.onload = () => {
            URL.revokeObjectURL(messageImage.src);
        };
    }

    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


document.addEventListener('DOMContentLoaded', function() {
    setInterval(fetchMessages, 2500);

    function sendMessageToServer(encryptedMessage, sender, receiver, imageData) {
        const accessKey = localStorage.getItem("access_key");
        const formData = new FormData();
        formData.append('message', encryptedMessage);
        formData.append('sender', sender);
        formData.append('receiver', receiver);
        if (imageData) {
            formData.append('file', imageData);
        }
    
        const fileInput = document.getElementById('imageInput');
        const fileData = fileInput.files[0];

        fetch('/messages', {
            method: 'POST',
            body: formData,
            headers: {
                "Authorization": accessKey
            }
        }).then(response => response.json())
          .then(data => {
              displayMessage(`${sender}-${data.time}`, sender, document.getElementById('messageInput').value, data.time, fileData);
              document.getElementById('messageInput').value = "";
          });
    }
    
    document.getElementById('sendMessageButton').addEventListener('click', async function() {
        const message = document.getElementById('messageInput').value;
        const sender = localStorage.getItem("username");
        const receiver = document.getElementById('chatTitle').textContent;
        const encryptionKey = document.getElementById('encryptKeyInput').value; 
        const encryptedMessage = encryptMessage(message, encryptionKey);
        const fileInput = document.getElementById('imageInput');
        const fileData = fileInput.files[0];
        
        let encryptedImage = null;
        if (fileData) {
            encryptedImage = await encryptImage(fileData, encryptionKey);
            const imageBlob = new Blob([encryptedImage], { type: 'image/jpeg' });
            encryptedImage = new File([imageBlob], "encrypted_image.jpg");
        }
    
        sendMessageToServer(encryptedMessage, sender, receiver, encryptedImage);
        
        fileInput.value = '';
        document.getElementById('imagePreview').style.display = "none";
        document.getElementById("fileNameLabel").textContent = "Загрузить изображение";
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
            document.getElementById("fileNameLabel").textContent = "Загрузить изображение";
        }
    });
});
