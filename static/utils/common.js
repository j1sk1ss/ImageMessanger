import { decryptMessage, decryptImage } from './crypto.js';
import { formatTime } from './date.js';


export function updatePaginationButtons(hasNext, page) {
    const prevButton = document.getElementById("prevPageButton");
    const nextButton = document.getElementById("nextPageButton");

    prevButton.disabled = (page === 0);
    nextButton.disabled = !hasNext;

    prevButton.classList.toggle("disabled-button", page === 0);
    nextButton.classList.toggle("active-button", hasNext);
    nextButton.classList.toggle("disabled-button", !hasNext);
}


export function displayMessage(sender, message, time, imageData) {
    const chatMessages = document.getElementById('chatMessages');
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message');

    const header = document.createElement('div');
    header.classList.add('message-header');
    header.innerHTML = `<strong>${sender}</strong> <span>${formatTime(time)}</span>`;
    messageContainer.appendChild(header);

    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.textContent = message;
    messageContainer.appendChild(messageText);

    if (imageData) {
        const messageImage = document.createElement('img');
        const imageUrl = URL.createObjectURL(imageData);

        messageImage.src = imageUrl;
        messageImage.classList.add('message-image');
        messageImage.style.cursor = 'pointer';
        
        messageImage.onclick = () => {
            const newTab = window.open(imageUrl, '_blank');
        };

        messageContainer.appendChild(messageImage);
    }

    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


export async function fetchMessages(page) {
    try {
        const accessKey = localStorage.getItem("access_key");
        if (accessKey === "") return;

        const encryptionKey = document.getElementById('encryptKeyInput').value;
        const sender = document.getElementById('chatTitle').textContent;
        const user = localStorage.getItem("username");
        const response = await fetch(
            `/messages?receiver=${user}&sender=${sender}&offset=${20 * page}&limit=20`, 
            {
                method: 'GET',
                headers: {
                    "Authorization": accessKey
                }
            }
        );
        
        const data = await response.json();
        for (const message of data.messages) {
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
                    }
                } catch (error) { }
            }

            displayMessage(message.from, msg, message.time, imageFile);
            updatePaginationButtons(data.has_next, page);
        }
    } catch (error) { }
}