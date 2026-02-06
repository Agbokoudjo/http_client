export function addLog(message:string, type = 'info') {
    const container = document.getElementById('log-container')!;
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;

    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

// Statistiques
export const stats = {
    total: 0,
    success: 0,
    failed: 0,
    times: []
};

export function updateStats(type:string|null = null) {
    if (type === 'success') stats.success++;
    if (type === 'failed') stats.failed++;

    document.getElementById('total-requests')!.textContent = `${stats.total}`;
    document.getElementById('success-requests')!.textContent = `${stats.success}`;
    document.getElementById('failed-requests')!.textContent = `${stats.failed}`;

    if (stats.times.length > 0) {
        const avg = stats.times.reduce((a, b) => a + b, 0) / stats.times.length;
        document.getElementById('avg-time')!.textContent = Math.round(avg) + 'ms';
    }
}

export function clearLogs() {
    const container = document.getElementById('log-container')!;
    container.innerHTML = '<div class="log-entry log-info">📋 Logs effacés...</div>';
};