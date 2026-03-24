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
            const presets = [
                "Professional & calm", "Excited & energetic", "Whisper",
                "Angry & loud", "Sad & melancholic", "News anchor", "Storyteller"
            ];
            const chipsHtml = presets.map(p => `<span class="preset-chip">${p}</span>`).join('');

            instructionsContainer.innerHTML = `
                <div class="instruction-input-wrap fade-in">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:4px;">
                        <label style="margin-bottom:0;">Style Instructions</label>
                    </div>
                    <input type="text" id="instruct-input" placeholder="Normal tone, excited, whispered..." required>
                    <div class="preset-chips" id="custom-presets">
                        ${chipsHtml}
                    </div>
                </div>
            `;

            setTimeout(() => {
                const input = document.getElementById('instruct-input');
                document.querySelectorAll('#custom-presets .preset-chip').forEach(chip => {
                    chip.addEventListener('click', () => {
                        input.value = chip.textContent;
                        input.focus();
                    });
                });
            }, 0);

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
            const presets = [
                "Old British man with a deep voice", "Young energetic girl",
                "Raspy gravelly cowboy", "Soft spoken narrator", "Anime mascot voice"
            ];
            const chipsHtml = presets.map(p => `<span class="preset-chip">${p}</span>`).join('');

            instructionsContainer.innerHTML = `
                <div class="instruction-input-wrap fade-in">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:4px;">
                        <label style="margin-bottom:0;">Voice Design Description</label>
                    </div>
                    <input type="text" id="instruct-input" placeholder="Old British man with a deep voice..." required>
                    <div class="preset-chips" id="design-presets">
                        ${chipsHtml}
                    </div>
                </div>
            `;

            setTimeout(() => {
                const input = document.getElementById('instruct-input');
                document.querySelectorAll('#design-presets .preset-chip').forEach(chip => {
                    chip.addEventListener('click', () => {
                        input.value = chip.textContent;
                        input.focus();
                    });
                });
            }, 0);

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
            let displayLabel = 'Running on Unknown';
            if (apiData.backend === 'mlx') {
                displayLabel = 'Running on <strong>Apple Silicon MLX</strong>';
            } else if (apiData.backend === 'cuda') {
                displayLabel = 'Running on <strong>NVIDIA CUDA</strong>';
            } else if (apiData.backend === 'cpu') {
                displayLabel = 'Running on <strong>CPU</strong>';
            }

            const spinnerSvg = `<svg class="icon spin" style="width: 14px; height: 14px;" viewBox="0 0 15 15" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.48877 6.75C7.29015 6.75 7.09967 6.82902 6.95923 6.96967C6.81879 7.11032 6.73989 7.30109 6.73989 7.5C6.73989 7.69891 6.81879 7.88968 6.95923 8.03033C7.09967 8.17098 7.29015 8.25 7.48877 8.25C7.68738 8.25 7.87786 8.17098 8.0183 8.03033C8.15874 7.88968 8.23764 7.69891 8.23764 7.5C8.23764 7.30109 8.15874 7.11032 8.0183 6.96967C7.87786 6.82902 7.68738 6.75 7.48877 6.75ZM7.8632 0C11.2331 0 11.3155 2.6775 9.54818 3.5625C8.80679 3.93 8.47728 4.7175 8.335 5.415C8.69446 5.565 9.00899 5.7975 9.24863 6.0975C12.0195 4.5975 15 5.19 15 7.875C15 11.25 12.3265 11.325 11.4428 9.5475C11.0684 8.805 10.2746 8.475 9.57813 8.3325C9.42836 8.6925 9.19621 9 8.89665 9.255C10.3869 12.0225 9.79531 15 7.11433 15C3.74438 15 3.67698 12.315 5.44433 11.43C6.17823 11.0625 6.50774 10.2825 6.65751 9.5925C6.29056 9.4425 5.96855 9.2025 5.72891 8.9025C2.96555 10.3875 0 9.8025 0 7.125C0 3.75 2.666 3.6675 3.54967 5.445C3.92411 6.1875 4.71043 6.51 5.40689 6.6525C5.54918 6.2925 5.78882 5.9775 6.09586 5.7375C4.60559 2.97 5.1972 0 7.8632 0Z"/></svg>`;
            badge.innerHTML = `
                <div class="badge-text">${displayLabel}</div>
                <div class="badge-divider"></div>
                <div class="badge-icon-wrap">${spinnerSvg}</div>
            `;
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

    // Harware Stats Polling Engine
    async function updateSystemStats() {
        try {
            const res = await fetch('/api/system_status');
            if (!res.ok) return;
            const stats = await res.json();
            const cpuLabel = document.getElementById('metric-cpu') || document.querySelector('.cpu-chip span');
            const gpuLabel = document.getElementById('metric-gpu');
            const ramLabel = document.getElementById('metric-ram') || document.querySelector('.ram-chip span');
            
            if (cpuLabel) cpuLabel.textContent = `CPU: ${stats.cpu}`;
            if (gpuLabel) gpuLabel.textContent = `GPU: ${stats.gpu}`;
            if (ramLabel) ramLabel.textContent = `RAM: ${stats.ram}`;
            
            // Visual dynamic indicator for high usage
            if (stats.raw_cpu > 80) {
                document.querySelector('.cpu-chip').style.color = '#f28b82';
                document.querySelector('.cpu-chip svg').style.color = '#f28b82';
            } else {
                document.querySelector('.cpu-chip').style.color = 'var(--text-secondary)';
                document.querySelector('.cpu-chip svg').style.color = '#8ab4f8';
            }
        } catch (e) {}
    }
    
    // Initial fetch, then repeat every 3 seconds
    updateSystemStats();
    setInterval(updateSystemStats, 3000);

});
