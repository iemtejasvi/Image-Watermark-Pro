document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const uploadOverlay = document.getElementById('uploadOverlay');
    const changeImageBtn = document.getElementById('changeImage');
    const deleteImageBtn = document.getElementById('deleteImage');
    const watermarkText = document.getElementById('watermarkText');
    const opacityInput = document.getElementById('opacity');
    const fontSizeInput = document.getElementById('fontSize');
    const rotationInput = document.getElementById('rotation');
    const spacingInput = document.getElementById('spacing');
    const colorInput = document.getElementById('color');
    const fontFamilySelect = document.getElementById('fontFamily');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const savePresetBtn = document.getElementById('savePresetBtn');
    const invertColorBtn = document.getElementById('invertColor');
    const randomColorBtn = document.getElementById('randomColor');
    const patternButtons = document.querySelectorAll('.pattern-btn');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const resetZoomBtn = document.getElementById('resetZoom');
    const fullscreenBtn = document.getElementById('fullscreen');
    const enableShadow = document.getElementById('enableShadow');
    const enableBlur = document.getElementById('enableBlur');
    const enableGradient = document.getElementById('enableGradient');
    const signature = document.getElementById('signature');

    // New DOM elements for dual text and settings
    const enableDualText = document.getElementById('enableDualText');
    const watermarkTextLeft = document.getElementById('watermarkTextLeft');
    const watermarkTextRight = document.getElementById('watermarkTextRight');
    const autoSaveSettings = document.getElementById('autoSaveSettings');
    const loadSettingsBtn = document.getElementById('loadSettingsBtn');

    // Value display elements
    const opacityValue = document.getElementById('opacityValue');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const rotationValue = document.getElementById('rotationValue');
    const spacingValue = document.getElementById('spacingValue');
    const imageDimensions = document.getElementById('imageDimensions');
    const imageSize = document.getElementById('imageSize');

    // State variables
    let originalImage = null;
    let currentPattern = 'diagonal';
    let currentZoom = 1;
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;
    let presets = JSON.parse(localStorage.getItem('watermarkPresets') || '[]');
    let isDrawing = false;
    let drawTimeout;

    // Signature protection
    const signatureHex = '54656A61737669';
    const signatureText = atob('VGVqYXN2aQ==');
    const heartHex = '2764';
    const builtWithHex = '4275696C74207769746820';
    signature.setAttribute('data-signature', signatureText);
    signature.textContent = `${String.fromCharCode(...builtWithHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))}${String.fromCharCode(parseInt(heartHex, 16))} ${String.fromCharCode(...signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))}`;

    // Optimize slider performance with requestAnimationFrame
    let sliderTimeout;
    function debounceSlider(callback) {
        if (sliderTimeout) {
            cancelAnimationFrame(sliderTimeout);
        }
        sliderTimeout = requestAnimationFrame(callback);
    }

    // Default settings
    const defaultSettings = {
        text: 'WATERMARK',
        textLeft: 'TEXT1',
        textRight: 'TEXT2',
        opacity: 40,
        fontSize: 24,
        rotation: 45,
        spacing: 5,
        color: '#ffffff',
        fontFamily: 'Roboto',
        pattern: 'diagonal',
        shadow: false,
        blur: false,
        gradient: false,
        dualText: false,
        autoSave: false
    };

    // Initialize settings
    function initializeSettings() {
        // Load saved settings from localStorage
        const savedSettings = JSON.parse(localStorage.getItem('watermarkSettings') || '{}');
        const settings = { ...defaultSettings, ...savedSettings };
        
        watermarkText.value = settings.text;
        watermarkTextLeft.value = settings.textLeft;
        watermarkTextRight.value = settings.textRight;
        opacityInput.value = settings.opacity;
        fontSizeInput.value = settings.fontSize;
        rotationInput.value = settings.rotation;
        spacingInput.value = settings.spacing;
        spacingInput.min = 5;
        spacingInput.max = 10;
        colorInput.value = settings.color;
        fontFamilySelect.value = settings.fontFamily;
        enableShadow.checked = settings.shadow;
        enableBlur.checked = settings.blur;
        enableGradient.checked = settings.gradient;
        enableDualText.checked = settings.dualText;
        autoSaveSettings.checked = settings.autoSave;
        
        // Show/hide dual text controls based on setting
        toggleDualTextControls(settings.dualText);
        
        updateValueDisplays();
    }

    // Update value displays with debouncing
    function updateValueDisplays() {
        requestAnimationFrame(() => {
            opacityValue.textContent = `${opacityInput.value}%`;
            fontSizeValue.textContent = `${fontSizeInput.value}px`;
            rotationValue.textContent = `${rotationInput.value}°`;
            spacingValue.textContent = `${spacingInput.value}x`;
        });
    }

    // Toggle dual text controls visibility
    function toggleDualTextControls(show) {
        const dualTextControls = document.querySelectorAll('.dual-text-controls');
        dualTextControls.forEach(control => {
            control.style.display = show ? 'block' : 'none';
        });
    }

    // Save settings to localStorage
    function saveSettings() {
        if (autoSaveSettings.checked) {
            const settings = {
                text: watermarkText.value,
                textLeft: watermarkTextLeft.value,
                textRight: watermarkTextRight.value,
                opacity: opacityInput.value,
                fontSize: fontSizeInput.value,
                rotation: rotationInput.value,
                spacing: spacingInput.value,
                color: colorInput.value,
                fontFamily: fontFamilySelect.value,
                pattern: currentPattern,
                shadow: enableShadow.checked,
                blur: enableBlur.checked,
                gradient: enableGradient.checked,
                dualText: enableDualText.checked,
                autoSave: autoSaveSettings.checked
            };
            localStorage.setItem('watermarkSettings', JSON.stringify(settings));
        }
    }

    // Optimize watermark drawing
    function drawWatermark() {
        if (!originalImage) return;

        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Enable high-quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw original image at full quality
            if (enableBlur.checked) {
                ctx.filter = 'blur(5px)';
            }
            ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';

            // Set watermark properties
            const fontSize = parseInt(fontSizeInput.value);
            const opacity = parseInt(opacityInput.value) / 100;
            const rotation = parseInt(rotationInput.value);
            const spacing = parseFloat(spacingInput.value);
            const text = watermarkText.value;
            const textLeft = watermarkTextLeft.value;
            const textRight = watermarkTextRight.value;
            const color = colorInput.value;

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.font = `${fontSize}px ${fontFamilySelect.value}`;
            
            if (enableGradient.checked) {
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, invertColor(color));
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = color;
            }

            if (enableShadow.checked) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const spacingPx = fontSize * spacing;
            const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
            const numWatermarks = Math.ceil(diagonal / spacingPx) * 2;

            // Draw watermark pattern
            switch (currentPattern) {
                case 'diagonal':
                    drawDiagonalPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas, textLeft, textRight);
                    break;
                case 'grid':
                    drawGridPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas, textLeft, textRight);
                    break;
                case 'random':
                    drawRandomPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas, textLeft, textRight);
                    break;
                case 'wave':
                    drawWavePattern(numWatermarks, spacingPx, rotation, text, ctx, canvas, textLeft, textRight);
                    break;
                case 'spiral':
                    drawSpiralPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas, textLeft, textRight);
                    break;
            }

            ctx.restore();
            downloadBtn.disabled = false;
        });
    }

    // Pattern drawing functions
    function drawDiagonalPattern(numWatermarks, spacing, rotation, text, ctx, canvas, textLeft, textRight) {
        for (let i = -numWatermarks; i < numWatermarks; i++) {
            for (let j = -numWatermarks; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing;
                drawWatermarkText(x, y, rotation, text, ctx, textLeft, textRight);
            }
        }
    }

    function drawGridPattern(numWatermarks, spacing, rotation, text, ctx, canvas, textLeft, textRight) {
        for (let i = 0; i < numWatermarks; i++) {
            for (let j = 0; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing;
                drawWatermarkText(x, y, rotation, text, ctx, textLeft, textRight);
            }
        }
    }

    function drawRandomPattern(numWatermarks, spacing, rotation, text, ctx, canvas, textLeft, textRight) {
        for (let i = 0; i < numWatermarks * 2; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            drawWatermarkText(x, y, rotation, text, ctx, textLeft, textRight);
        }
    }

    function drawWavePattern(numWatermarks, spacing, rotation, text, ctx, canvas, textLeft, textRight) {
        for (let i = 0; i < numWatermarks; i++) {
            for (let j = 0; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing + Math.sin(i * 0.5) * spacing;
                drawWatermarkText(x, y, rotation, text, ctx, textLeft, textRight);
            }
        }
    }

    function drawSpiralPattern(numWatermarks, spacing, rotation, text, ctx, canvas, textLeft, textRight) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        for (let i = 0; i < numWatermarks * 2; i++) {
            const angle = i * 0.5;
            const radius = i * spacing * 0.5;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            drawWatermarkText(x, y, rotation, text, ctx, textLeft, textRight);
        }
    }

    function drawWatermarkText(x, y, rotation, text, ctx, textLeft, textRight) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        
        // Determine which text to use for dual text mode
        let textToDraw = text;
        if (enableDualText.checked && textLeft && textRight) {
            // Randomly choose between left and right text
            textToDraw = Math.random() < 0.5 ? textLeft : textRight;
        }
        
        ctx.fillText(textToDraw, 0, 0);
        ctx.restore();
    }

    // Separate function for download to support dual text with tempCanvas
    function drawWatermarkTextForDownload(x, y, rotation, text, ctx, tempCanvas, textLeft, textRight) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        
        // Determine which text to use for dual text mode
        let textToDraw = text;
        if (enableDualText.checked && textLeft && textRight) {
            // Randomly choose between left and right text
            textToDraw = Math.random() < 0.5 ? textLeft : textRight;
        }
        
        ctx.fillText(textToDraw, 0, 0);
        ctx.restore();
    }

    // Pattern drawing functions for download
    function drawDiagonalPatternForDownload(numWatermarks, spacing, rotation, text, ctx, tempCanvas, textLeft, textRight) {
        for (let i = -numWatermarks; i < numWatermarks; i++) {
            for (let j = -numWatermarks; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing;
                drawWatermarkTextForDownload(x, y, rotation, text, ctx, tempCanvas, textLeft, textRight);
            }
        }
    }

    function drawGridPatternForDownload(numWatermarks, spacing, rotation, text, ctx, tempCanvas, textLeft, textRight) {
        for (let i = 0; i < numWatermarks; i++) {
            for (let j = 0; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing;
                drawWatermarkTextForDownload(x, y, rotation, text, ctx, tempCanvas, textLeft, textRight);
            }
        }
    }

    function drawRandomPatternForDownload(numWatermarks, spacing, rotation, text, ctx, tempCanvas, textLeft, textRight) {
        for (let i = 0; i < numWatermarks * 2; i++) {
            const x = Math.random() * tempCanvas.width;
            const y = Math.random() * tempCanvas.height;
            drawWatermarkTextForDownload(x, y, rotation, text, ctx, tempCanvas, textLeft, textRight);
        }
    }

    function drawWavePatternForDownload(numWatermarks, spacing, rotation, text, ctx, tempCanvas, textLeft, textRight) {
        for (let i = 0; i < numWatermarks; i++) {
            for (let j = 0; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing + Math.sin(i * 0.5) * spacing;
                drawWatermarkTextForDownload(x, y, rotation, text, ctx, tempCanvas, textLeft, textRight);
            }
        }
    }

    function drawSpiralPatternForDownload(numWatermarks, spacing, rotation, text, ctx, tempCanvas, textLeft, textRight) {
        const centerX = tempCanvas.width / 2;
        const centerY = tempCanvas.height / 2;
        for (let i = 0; i < numWatermarks * 2; i++) {
            const angle = i * 0.5;
            const radius = i * spacing * 0.5;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            drawWatermarkTextForDownload(x, y, rotation, text, ctx, tempCanvas, textLeft, textRight);
        }
    }

    // Color utilities
    function invertColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `#${(255 - r).toString(16).padStart(2, '0')}${(255 - g).toString(16).padStart(2, '0')}${(255 - b).toString(16).padStart(2, '0')}`;
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Handle image upload
    function handleImageUpload(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                originalImage = new Image();
                originalImage.onload = () => {
                    // Set canvas size to match container while maintaining aspect ratio
                    const container = document.querySelector('.preview-container');
                    const containerWidth = container.clientWidth;
                    const containerHeight = container.clientHeight;
                    
                    // Calculate dimensions to maintain aspect ratio
                    const imageAspectRatio = originalImage.width / originalImage.height;
                    
                    let canvasWidth, canvasHeight;
                    
                    if (isMobile()) {
                        // Mobile: fit to container while maintaining aspect ratio
                        if (imageAspectRatio > 1) {
                            // Landscape image
                            canvasWidth = containerWidth;
                            canvasHeight = containerWidth / imageAspectRatio;
                        } else {
                            // Portrait image
                            canvasHeight = containerHeight;
                            canvasWidth = containerHeight * imageAspectRatio;
                        }
                    } else {
                        // Desktop: use original image dimensions with max constraints
                        const maxWidth = Math.min(originalImage.width, containerWidth * 2);
                        const maxHeight = Math.min(originalImage.height, containerHeight * 2);
                        
                        if (maxWidth / maxHeight > imageAspectRatio) {
                            canvasHeight = maxHeight;
                            canvasWidth = maxHeight * imageAspectRatio;
                        } else {
                            canvasWidth = maxWidth;
                            canvasHeight = maxWidth / imageAspectRatio;
                        }
                    }
                    
                    // Set canvas dimensions to match original image quality
                    canvas.width = originalImage.width;
                    canvas.height = originalImage.height;
                    
                    // Enable high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Update image info
                    imageDimensions.textContent = `${originalImage.width} × ${originalImage.height}`;
                    imageSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
                    
                    // Show controls
                    uploadOverlay.classList.add('hidden');
                    changeImageBtn.style.display = 'flex';
                    deleteImageBtn.style.display = 'flex';
                    dropZone.classList.add('has-image');
                    
                    // Draw watermark
                    drawWatermark();
                };
                originalImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // Delete image
    function deleteImage() {
        originalImage = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        imageDimensions.textContent = 'No image loaded';
        imageSize.textContent = '0 KB';
        uploadOverlay.classList.remove('hidden');
        changeImageBtn.style.display = 'none';
        deleteImageBtn.style.display = 'none';
        dropZone.classList.remove('has-image');
        downloadBtn.disabled = true;
        // Clear the file input value
        imageInput.value = '';
    }

    // Event Listeners
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleImageUpload(file);
    });

    changeImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    deleteImageBtn.addEventListener('click', deleteImage);

    // Drag and drop functionality
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleImageUpload(file);
    });

    // Optimize control changes with debouncing
    [watermarkText, opacityInput, fontSizeInput, rotationInput, spacingInput, colorInput, fontFamilySelect].forEach(control => {
        control.addEventListener('input', () => {
            debounceSlider(() => {
                updateValueDisplays();
                drawWatermark();
                saveSettings();
            });
        });
    });

    // Dual text controls
    [watermarkTextLeft, watermarkTextRight].forEach(control => {
        control.addEventListener('input', () => {
            debounceSlider(() => {
                drawWatermark();
                saveSettings();
            });
        });
    });

    // Handle Enter key in watermark text inputs
    [watermarkText, watermarkTextLeft, watermarkTextRight].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
        });
    });

    // Dual text toggle
    enableDualText.addEventListener('change', () => {
        toggleDualTextControls(enableDualText.checked);
        drawWatermark();
        saveSettings();
    });

    // Auto-save toggle
    autoSaveSettings.addEventListener('change', () => {
        saveSettings();
    });

    // Advanced options
    [enableShadow, enableBlur, enableGradient].forEach(option => {
        option.addEventListener('change', () => {
            drawWatermark();
            saveSettings();
        });
    });

    // Pattern selection
    patternButtons.forEach(button => {
        button.addEventListener('click', () => {
            patternButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentPattern = button.id;
            drawWatermark();
            saveSettings();
        });
    });

    // Color controls
    invertColorBtn.addEventListener('click', () => {
        colorInput.value = invertColor(colorInput.value);
        drawWatermark();
        saveSettings();
    });

    randomColorBtn.addEventListener('click', () => {
        colorInput.value = getRandomColor();
        drawWatermark();
        saveSettings();
    });

    // Reset settings
    resetBtn.addEventListener('click', () => {
        // Clear saved settings
        localStorage.removeItem('watermarkSettings');
        // Reinitialize with defaults
        initializeSettings();
        drawWatermark();
    });

    // Save preset
    savePresetBtn.addEventListener('click', () => {
        const preset = {
            name: prompt('Enter preset name:'),
            settings: {
                text: watermarkText.value,
                textLeft: watermarkTextLeft.value,
                textRight: watermarkTextRight.value,
                opacity: opacityInput.value,
                fontSize: fontSizeInput.value,
                rotation: rotationInput.value,
                spacing: spacingInput.value,
                color: colorInput.value,
                fontFamily: fontFamilySelect.value,
                pattern: currentPattern,
                shadow: enableShadow.checked,
                blur: enableBlur.checked,
                gradient: enableGradient.checked,
                dualText: enableDualText.checked,
                autoSave: autoSaveSettings.checked
            }
        };
        presets.push(preset);
        localStorage.setItem('watermarkPresets', JSON.stringify(presets));
        alert('Preset saved successfully!');
    });

    // Load settings
    loadSettingsBtn.addEventListener('click', () => {
        const savedSettings = JSON.parse(localStorage.getItem('watermarkSettings') || '{}');
        if (Object.keys(savedSettings).length === 0) {
            alert('No saved settings found!');
            return;
        }
        
        // Apply saved settings
        if (savedSettings.text) watermarkText.value = savedSettings.text;
        if (savedSettings.textLeft) watermarkTextLeft.value = savedSettings.textLeft;
        if (savedSettings.textRight) watermarkTextRight.value = savedSettings.textRight;
        if (savedSettings.opacity) opacityInput.value = savedSettings.opacity;
        if (savedSettings.fontSize) fontSizeInput.value = savedSettings.fontSize;
        if (savedSettings.rotation) rotationInput.value = savedSettings.rotation;
        if (savedSettings.spacing) spacingInput.value = savedSettings.spacing;
        if (savedSettings.color) colorInput.value = savedSettings.color;
        if (savedSettings.fontFamily) fontFamilySelect.value = savedSettings.fontFamily;
        if (savedSettings.shadow !== undefined) enableShadow.checked = savedSettings.shadow;
        if (savedSettings.blur !== undefined) enableBlur.checked = savedSettings.blur;
        if (savedSettings.gradient !== undefined) enableGradient.checked = savedSettings.gradient;
        if (savedSettings.dualText !== undefined) enableDualText.checked = savedSettings.dualText;
        if (savedSettings.autoSave !== undefined) autoSaveSettings.checked = savedSettings.autoSave;
        if (savedSettings.pattern) {
            currentPattern = savedSettings.pattern;
            patternButtons.forEach(btn => btn.classList.remove('active'));
            const patternBtn = document.getElementById(savedSettings.pattern);
            if (patternBtn) patternBtn.classList.add('active');
        }
        
        // Update UI
        toggleDualTextControls(enableDualText.checked);
        updateValueDisplays();
        drawWatermark();
        
        alert('Settings loaded successfully!');
    });

    // Optimize download functionality for highest quality
    downloadBtn.addEventListener('click', () => {
        // Create a temporary canvas to maintain original dimensions
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { 
            alpha: true,
            willReadFrequently: false,
            desynchronized: true
        });
        
        // Set dimensions to match original image exactly
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        
        // Enable high-quality rendering
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        
        // Draw original image at full quality
        tempCtx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height);
        
        // Apply watermark with original dimensions
        const fontSize = parseInt(fontSizeInput.value);
        const opacity = parseInt(opacityInput.value) / 100;
        const rotation = parseInt(rotationInput.value);
        const spacing = parseFloat(spacingInput.value);
        const text = watermarkText.value;
        const textLeft = watermarkTextLeft.value;
        const textRight = watermarkTextRight.value;
        const color = colorInput.value;

        tempCtx.save();
        tempCtx.globalAlpha = opacity;
        tempCtx.font = `${fontSize}px ${fontFamilySelect.value}`;
        
        if (enableGradient.checked) {
            const gradient = tempCtx.createLinearGradient(0, 0, tempCanvas.width, tempCanvas.height);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, invertColor(color));
            tempCtx.fillStyle = gradient;
        } else {
            tempCtx.fillStyle = color;
        }

        if (enableShadow.checked) {
            tempCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            tempCtx.shadowBlur = 5;
            tempCtx.shadowOffsetX = 2;
            tempCtx.shadowOffsetY = 2;
        }

        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';

        const spacingPx = fontSize * spacing;
        const diagonal = Math.sqrt(tempCanvas.width * tempCanvas.width + tempCanvas.height * tempCanvas.height);
        const numWatermarks = Math.ceil(diagonal / spacingPx) * 2;

        // Draw watermark pattern
        switch (currentPattern) {
            case 'diagonal':
                drawDiagonalPatternForDownload(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas, textLeft, textRight);
                break;
            case 'grid':
                drawGridPatternForDownload(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas, textLeft, textRight);
                break;
            case 'random':
                drawRandomPatternForDownload(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas, textLeft, textRight);
                break;
            case 'wave':
                drawWavePatternForDownload(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas, textLeft, textRight);
                break;
            case 'spiral':
                drawSpiralPatternForDownload(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas, textLeft, textRight);
                break;
        }

        tempCtx.restore();

        // Create download link with highest quality PNG
        const link = document.createElement('a');
        const timestamp = Date.now();
        link.download = `watermarked-image-${timestamp}.png`;
        
        // Use maximum quality settings for PNG export
        const quality = 1.0;
        const mimeType = 'image/png';
        
        // Convert to blob for better quality
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }, mimeType, quality);
    });

    // Initialize zoom state
    canvas.style.cursor = 'grab';
    canvas.style.transformOrigin = 'center center';
    canvas.style.willChange = 'transform';
    canvas.style.transition = 'transform 0.2s ease-out';

    // Ensure canvas container is properly set up
    const canvasContainer = canvas.parentElement;
    if (canvasContainer) {
        canvasContainer.style.overflow = 'hidden';
        canvasContainer.style.position = 'relative';
        canvasContainer.style.width = '100%';
        canvasContainer.style.height = '100%';
    }

    // Add debug styles
    const style = document.createElement('style');
    style.textContent = `
        #canvas {
            transform-origin: center center !important;
            will-change: transform !important;
            transition: transform 0.2s ease-out !important;
        }
        .canvas-zoomed {
            transform: scale(var(--zoom-level)) !important;
        }
        .canvas-translated {
            transform: translate3d(var(--translate-x), var(--translate-y), 0) scale(var(--zoom-level)) !important;
        }
    `;
    document.head.appendChild(style);

    function updateCanvasTransform() {
        // Set CSS custom properties
        canvas.style.setProperty('--zoom-level', currentZoom);
        canvas.style.setProperty('--translate-x', `${translateX}px`);
        canvas.style.setProperty('--translate-y', `${translateY}px`);
        
        // Remove any existing transform classes
        canvas.classList.remove('canvas-zoomed', 'canvas-translated');
        
        // Add appropriate transform class
        if (isMobile()) {
            canvas.classList.add('canvas-zoomed');
        } else {
            canvas.classList.add('canvas-translated');
        }
        
        // Force a reflow
        canvas.offsetHeight;
    }

    // Add event listeners for zoom controls
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom + 0.2, 3);
            updateCanvasTransform();
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom - 0.2, 0.5);
            updateCanvasTransform();
        });
    }
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            currentZoom = 1;
            translateX = 0;
            translateY = 0;
            // Force reset by removing all transforms first
            canvas.style.transform = '';
            canvas.classList.remove('canvas-zoomed', 'canvas-translated');
            canvas.offsetHeight; // Force reflow
            updateCanvasTransform();
        });
    }

    // Initialize transform
    updateCanvasTransform();

    // Fullscreen functionality
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            canvas.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Mobile touch handling
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Initialize
    initializeSettings();
}); 
