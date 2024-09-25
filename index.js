var data = [];
var width = 620;
var height = 800;
var pdfName;
var fileName = '';

const createPDF = document.getElementById('create-pdf');

encodeImageFileAsURL = (element) => {
    document.getElementById('input-page').style.display = 'none';
    document.getElementById('pdf-page').style.display = 'inline-block';

    const length = element.files.length;
    for (var i = 0; i < length; i++) {
        let file = element.files[i];
        let pdfname = element.files[0];
        let reader = new FileReader();
        reader.readAsDataURL(file);

        let obj = {
            list: reader,
            fileName: file.name,
            time: new Date().toString() + i
        }

        reader.onloadend = () => {
            data = [...data, obj];
            pdfName = pdfname.name;
        }
    }

    setTimeout(convertToPDF, 1000);
    document.getElementById('upload-file').value = null;
    setTimeout(saveAsPDF, 1000);
}

saveAsPDF = () => {
    document.getElementById('upload-msg').style.display = 'none';
    document.getElementById('convertBtn').style.display = 'inline-block';
}

// Function to calculate PDF size
function calcPdfSize() {
    let totalSize = 0;
    data.forEach(item => {
        if (item.list.result) {
            const imageSize = (item.list.result.length * (3 / 4)) - (item.list.result.split(',')[1].length / 4); // Approximate image size
            totalSize += imageSize;
        }
    });
    return totalSize / (1024 * 1024); // Convert to MB
}

// Delete item from pdf page
handleDelete = (e) => {
    data = data.filter((item) => item.time !== e.currentTarget.id);
    if (data.length == 0) {
        location.reload();
    } else {
        convertToPDF();
    }
}

// Initiate file downloading
embedImages = async () => {
    const pdfDoc = await PDFLib.PDFDocument.create();
    
    // Show loading indicator
    document.getElementById('loading-indicator').style.display = 'block';

    // Process images concurrently
    const imagePromises = data.map(async (item) => {
        const imageUrl = item.list.result;
        const imageBytes = await fetch(imageUrl).then((res) => res.arrayBuffer());

        let image;

        const fileExtension = item.fileName.split('.').pop().toLowerCase();
        if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
            image = await pdfDoc.embedJpg(imageBytes);
        } else if (fileExtension === 'png') {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            console.error('Unsupported image format:', item.fileName);
            return; // Skip unsupported formats
        }

        return { image, item }; // Return image and item for further processing
    });

    // Wait for all images to be loaded
    const loadedImages = await Promise.all(imagePromises);

    for (const { image, item } of loadedImages.filter(Boolean)) {
        const { width: originalWidth, height: originalHeight } = image.scale(1);

        const scale = Math.min((width - 40) / originalWidth, (height - 100) / originalHeight);
        const newWidth = originalWidth * scale;
        const newHeight = originalHeight * scale;

        const page = pdfDoc.addPage();
        page.setSize(width, height);

        const x = (page.getWidth() - newWidth) / 2;
        const y = (page.getHeight() - newHeight) / 2;

        page.drawImage(image, {
            x: x,
            y: y,
            width: newWidth,
            height: newHeight,
        });
    }

    const pdfBytes = await pdfDoc.save();
    download(pdfBytes, pdfName.replace(/\.[^/.]+$/, "") + ".pdf", "application/pdf");

    // Hide loading indicator
    document.getElementById('loading-indicator').style.display = 'none';

    // Back to home page after downloading file
    setTimeout(backToHomepage, 1000);

    
}



// Display pdf images
function convertToPDF() {
    createPDF.innerHTML = '';
    data.map((item, i) => {
        const fileItem = document.createElement('div');
        fileItem.setAttribute('class', 'file-item');
        fileItem.setAttribute('draggable', 'true'); // Make the item draggable
        fileItem.setAttribute('id', `item-${i}`); // Unique ID for each item
        fileItem.addEventListener('dragstart', dragStart);
        fileItem.addEventListener('dragover', dragOver);
        fileItem.addEventListener('drop', drop);


        const modify = document.createElement('div');
        modify.setAttribute('class', 'modify');

        const button2 = document.createElement('button');
        button2.setAttribute('class', 'delete-btn');
        button2.setAttribute('id', item.time);
        const remove = document.createElement('i');
        remove.setAttribute('class', 'fa fa-trash');
        button2.appendChild(remove);
        button2.addEventListener('click', (e) => {
            handleDelete(e);
        });

        modify.appendChild(button2);
        fileItem.appendChild(modify);

        const imgContainer = document.createElement('div');
        imgContainer.setAttribute('class', 'img-container');
        const img = document.createElement('img');
        img.setAttribute('id', 'img');
        img.src = item.list.result;
        imgContainer.appendChild(img);
        fileItem.appendChild(imgContainer);

        const imgName = document.createElement('p');
        imgName.setAttribute('id', 'img-name');
        imgName.innerHTML = item.fileName;
        fileItem.appendChild(imgName);

        // fileItem is the child of createPDF
        createPDF.appendChild(fileItem);
    });

    const addMoreFile = document.createElement('div');
    addMoreFile.setAttribute('class', 'add-more-file');

    const addFile = document.createElement('div');
    addFile.setAttribute('class', 'inp-cont');

    const input = document.createElement('input');
    input.setAttribute('id', 'inp');
    input.type = 'file';
    input.multiple = 'true';
    input.onchange = function () {
        encodeImageFileAsURL(this);
    }

    const p = document.createElement('p');
    const i = document.createElement('i');
    i.setAttribute('class', 'fa fa-plus');

    p.appendChild(i);

    const label = document.createElement('label');
    label.htmlFor = 'inp';
    label.innerHTML = 'Add Files';

    addFile.appendChild(p);
    addFile.appendChild(label);
    addFile.appendChild(input);

    // addFile is the child of addMoreFile
    addMoreFile.appendChild(addFile);

    // addMoreFile is the child of createPDF
    createPDF.appendChild(addMoreFile);
}

// Back to home 
function backToHomepage() {
    location.reload();
}





let draggedItem = null;

function dragStart(e) {
    draggedItem = this; // Store the reference to the dragged item
    e.dataTransfer.effectAllowed = 'move'; // Indicate a move action
}

function dragOver(e) {
    e.preventDefault(); // Prevent default to allow drop
}

function drop(e) {
    e.preventDefault(); // Prevent default action (e.g., opening as link)

    if (draggedItem) {
        const dropTarget = this;
        const parent = dropTarget.parentNode;

        // Determine where to insert the dragged item
        const dropRect = dropTarget.getBoundingClientRect();
        const offsetY = e.clientY - dropRect.top; // Calculate vertical position

        // If dragged item is below the drop target, insert after; otherwise, insert before
        if (offsetY > dropRect.height / 2) {
            parent.insertBefore(draggedItem, dropTarget.nextSibling);
        } else {
            parent.insertBefore(draggedItem, dropTarget);
        }

        // Update the data array based on new order
        updateDataOrder();
    }
}

function updateDataOrder() {
    const items = document.querySelectorAll('.file-item');
    data = Array.from(items).map((item, index) => {
        const itemId = item.getAttribute('id').split('-')[1]; // Extract index from ID
        return data[itemId]; // Map to original data array
    });
}

