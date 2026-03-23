document.addEventListener('DOMContentLoaded', async () => {
    const modelSelect = document.getElementById('model-select');
    const dynamicSettings = document.getElementById('dynamic-settings');
    const instructionsContainer = document.getElementById('instructions-container');
    const textInput = document.getElementById('text-input');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');

    const outputSection = document.getElementById('output-section');
    const audioResult = document.getElementById('audio-result');
    const statusText = document.getElementById('status-text');
    const historyList = document.getElementById('history-list');

    let apiData = null;
    let availableVoices = [];

    async function fetchVoices() {
        try {
            const res = await fetch('/api/voices');
            const data = await res.json();
            availableVoices = data.voices || [];
        } catch (e) {
            console.error("Failed to fetch voice list", e);
        }
    }

    function populateModels(models) {
        modelSelect.innerHTML = '<option value="" disabled selected>Pilih configuration...</option>';
        for (const [key, info] of Object.entries(models)) {
            const size = key <= 3 ? "1.7B Pro" : "0.6B Lite";
            const opt = document.createElement('option');
            opt.value = key;
            opt.dataset.mode = info.mode === "clone_manager" ? "clone" : info.mode;
            opt.textContent = `${info.name} - ${size}`;
            modelSelect.appendChild(opt);
        }

        if (modelSelect.options.length > 1) {
            modelSelect.selectedIndex = 1;
            modelSelect.dispatchEvent(new Event('change'));
        }
    }

    modelSelect.addEventListener('change', async (e) => {
        const mode = e.target.selectedOptions[0].dataset.mode;
        renderDynamicLayout(mode);
    });

    async function renderDynamicLayout(mode) {
        dynamicSettings.innerHTML = '';
        instructionsContainer.innerHTML = '';

        if (mode === "custom") {
            instructionsContainer.innerHTML = `
                <div class="instruction-input-wrap fade-in">
                    <label>Style Instructions</label>
                    <input type="text" id="instruct-input" placeholder="Normal tone, excited, whispered..." required>
                </div>
            `;

            let speakersHtml = `<option value="" disabled selected>Select voice...</option>`;
            apiData.speakers.forEach(s => { speakersHtml += `<option value="${s}">${s}</option>`; });

            dynamicSettings.innerHTML = `
                <div class="settings-block fade-in">
                    <h4 class="section-subtitle">Voice Settings</h4>
                    <div class="form-group">
                        <label>Speaker Voice</label>
                        <div class="select-container">
                            <select id="speaker-input" required>${speakersHtml}</select>
                        </div>
                    </div>
                </div>
                
                <div class="settings-block fade-in">
                    <h4 class="section-subtitle">Advanced</h4>
                    <div class="form-group">
                        <label>Speech Rate</label>
                        <div class="select-container">
                            <select id="speed-input">
                                <option value="1.0" selected>Normal (1.0x)</option>
                                <option value="1.3">Fast (1.3x)</option>
                                <option value="0.8">Slow (0.8x)</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }
        else if (mode === "design") {
            instructionsContainer.innerHTML = `
                <div class="instruction-input-wrap fade-in">
                    <label>Voice Design Description</label>
                    <input type="text" id="instruct-input" placeholder="Old British man with a deep voice..." required>
                </div>
            `;

            dynamicSettings.innerHTML = `
                <div class="settings-block fade-in">
                    <p class="helper-text"><strong>Voice Design</strong> mode uses text on the left to generate a custom voice from scratch.</p>
                </div>
            `;
        }
        else if (mode === "clone") {
            instructionsContainer.innerHTML = `
                <div class="instruction-input-wrap fade-in">
                    <label>Audio Transcription (Optional)</label>
                    <input type="text" id="ref-text-input" placeholder="Type what is spoken in the reference audio...">
                </div>
            `;

            await fetchVoices();
            let voicesHtml = `<option value="">-- Saved Voices --</option>`;
            availableVoices.forEach(v => { voicesHtml += `<option value="${v}">${v}</option>`; });

            dynamicSettings.innerHTML = `
                <div class="settings-block fade-in">
                    <h4 class="section-subtitle">Reference Audio</h4>
                    <div class="form-group">
                        <label>Select Enrolled Voice</label>
                        <div class="select-container">
                            <select id="ref-voice-input">${voicesHtml}</select>
                        </div>
                        <p class="helper-text" style="text-align:center; margin: 12px 0;">-- OR --</p>
                        <label>Upload Reference Wav</label>
                        <input type="file" id="ref-audio-input" accept="audio/*">
                    </div>
                </div>
            `;

            const refVoiceSelected = document.getElementById('ref-voice-input');
            const refAudioInput = document.getElementById('ref-audio-input');

            refVoiceSelected.addEventListener('change', () => {
                if (refVoiceSelected.value) refAudioInput.value = "";
            });
            refAudioInput.addEventListener('change', () => {
                if (refAudioInput.files.length > 0) refVoiceSelected.value = "";
            });
        }
    }

    generateBtn.addEventListener('click', async () => {
        if (!modelSelect.value) {
            alert("Model is still loading. Please wait.");
            return;
        }
        if (!textInput.value.trim()) {
            alert("Please enter script text to synthesize!");
            textInput.focus();
            return;
        }

        const mode = modelSelect.selectedOptions[0].dataset.mode;
        const formData = new FormData();
        formData.append("model_key", modelSelect.value);
        formData.append("mode", mode);
        formData.append("text", textInput.value.trim());

        if (mode === "custom") {
            const speaker = document.getElementById('speaker-input').value;
            const instruct = document.getElementById('instruct-input').value;
            const speed = document.getElementById('speed-input').value;
            if (!speaker) { alert('Please select a speaker voice!'); return; }
            if (!instruct) { alert('Please enter style instructions!'); return; }
            formData.append("speaker", speaker);
            formData.append("instruct", instruct);
            formData.append("speed", speed);
        } else if (mode === "design") {
            const instruct = document.getElementById('instruct-input').value;
            if (!instruct) { alert('Please enter a voice design description!'); return; }
            formData.append("instruct", instruct);
        } else if (mode === "clone") {
            const refVoice = document.getElementById('ref-voice-input').value;
            const refAudioInput = document.getElementById('ref-audio-input').files;
            const refText = document.getElementById('ref-text-input').value;

            if (!refVoice && (!refAudioInput || refAudioInput.length === 0)) {
                alert("You must select an enrolled voice or upload a reference wav."); return;
            }
            if (refVoice) formData.append("ref_voice", refVoice);
            if (refAudioInput && refAudioInput.length > 0) formData.append("ref_audio", refAudioInput[0]);
            if (refText) formData.append("ref_text", refText);
        }

        generateBtn.disabled = true;
        btnText.textContent = "Synthesizing...";
        loader.classList.remove('hidden');

        outputSection.classList.remove('hidden');
        audioResult.style.display = 'block';
        
        // Render Skeleton Generation Card
        audioResult.innerHTML = `
            <div class="skeleton-card fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color:var(--text-accent); font-size:14px; display:flex; align-items:center; gap:8px;">
                        <svg class="icon spin" viewBox="0 0 24 24"><path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8zm0 16c-4.42 0-8-3.58-8-8H2c0 5.52 4.48 10 10 10v-2zm8-8c0-4.42-3.58-8-8-8v2c4.42 0 8 3.58 8 8h2z"/></svg>
                        Synthesizing Audio...
                    </strong>
                </div>
                <div class="skeleton-text skeleton-title"></div>
                <div class="skeleton-text skeleton-subtitle"></div>
                <div class="skeleton-player" style="margin-top:8px;"></div>
            </div>
        `;

        try {
            const response = await fetch('/api/generate', { method: 'POST', body: formData });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Failed to generate audio clip");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            let filename = `Output_Audio.wav`;
            const disposition = response.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            audioResult.style.display = 'none';

            const historyItem = document.createElement('div');
            historyItem.className = 'history-item fade-in';
            historyItem.style.padding = "16px";
            historyItem.style.marginBottom = "16px";
            historyItem.style.borderRadius = "12px";
            historyItem.style.border = "1px solid var(--border-color)";
            historyItem.style.backgroundColor = "var(--bg-panel)";
            
            const logDate = new Date().toLocaleTimeString();
            historyItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="display: flex; flex-direction: column; padding-right: 16px; overflow: hidden;">
                        <strong style="color:var(--text-primary); font-size:15px; font-weight:500; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${filename}</strong>
                        <span style="margin-top:4px; font-size:13px; color:var(--text-secondary); line-height:1.4;">[${logDate}] ${textInput.value.substring(0, 90)}...</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; flex-shrink: 0;">
                        <a href="${url}" download="${filename}" title="Download Audio" style="color:var(--text-secondary); cursor:pointer; display:flex;">
                            <svg class="icon" viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;transition:fill 0.2s;" onmouseover="this.style.fill='var(--text-primary)'" onmouseout="this.style.fill='currentColor'"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        </a>
                        <button class="delete-btn" title="Delete Clip" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:flex; padding:0;">
                            <svg class="icon" viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;transition:fill 0.2s;" onmouseover="this.style.fill='#f28b82'" onmouseout="this.style.fill='currentColor'"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </div>
                <audio controls src="${url}" style="width: 100%; height: 36px; border-radius: 18px; outline: none;"></audio>
            `;
            
            const deleteBtn = historyItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                historyItem.style.opacity = '0';
                historyItem.style.transform = 'translateY(-10px)';
                historyItem.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    historyItem.remove();
                    URL.revokeObjectURL(url);
                }, 300);
            });
            
            
            historyList.prepend(historyItem);

        } catch (error) {
            audioResult.style.display = 'block';
            audioResult.innerHTML = `
                <div style="padding: 16px; border-radius: 12px; border: 1px solid #f28b82; background: rgba(242, 139, 130, 0.1); color: #f28b82; margin-bottom: 16px;">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
            btnText.textContent = "Run Synthesis";
            loader.classList.add('hidden');
        }
    });

    const svgs = document.querySelectorAll('.icon');
    svgs.forEach(svg => {
        svg.style.transition = 'fill 0.2s';
    });

    // Initialize layout by fetching metadata
    try {
        const res = await fetch('/api/metadata');
        if (!res.ok) throw new Error("Failed to fetch metadata");
        apiData = await res.json();
        
        const badge = document.getElementById('backend-badge');
        if (badge && apiData.backend) {
            badge.textContent = apiData.backend;
            badge.className = `badge ${apiData.backend}`;
        }
        
        populateModels(apiData.models);
    } catch (err) {
        audioResult.innerHTML = `
            <div style="padding: 16px; border-radius: 12px; border: 1px solid #f28b82; background: rgba(242, 139, 130, 0.1); color: #f28b82; margin-bottom: 16px;">
                <strong>Error:</strong> ${err.message}
            </div>
        `;
        audioResult.style.display = 'block';
        outputSection.classList.remove('hidden');
    }
});
