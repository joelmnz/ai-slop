let watchedRepos = [];
let cachedData = {};

function init() {
    loadWatchedRepos();
    loadCache();
    if (typeof DOMPurify !== 'undefined') {
        renderContent();
    } else {
        const checkDOMPurify = setInterval(() => {
            if (typeof DOMPurify !== 'undefined') {
                clearInterval(checkDOMPurify);
                renderContent();
            }
        }, 100);
    }
}

function loadWatchedRepos() {
    const repos = localStorage.getItem('watchedRepos');
    watchedRepos = repos ? repos.split('\n').filter(repo => repo.trim() !== '').map(repo => {
        const match = repo.match(/https:\/\/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : repo;
    }) : [];
}

function loadCache() {
    cachedData = JSON.parse(localStorage.getItem('releaseNotesCache') || '{}');
}

function saveCache() {
    localStorage.setItem('releaseNotesCache', JSON.stringify(cachedData));
}

async function fetchReleaseNotes(repo) {
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return {
                repo: repo,
                version: data.tag_name,
                body: data.body,
                published_at: data.published_at,
                age_in_days: calculateAgeInDays(data.published_at)
            };
        } else {
            const errorData = await response.json();
            return {
                repo: repo,
                error: `HTTP ${response.status}: ${errorData.message || 'Unknown error'}`
            };
        }
    } catch (error) {
        return {
            repo: repo,
            error: `Network error: ${error.message}`
        };
    }
}

function calculateAgeInDays(dateString) {
    const publishedDate = new Date(dateString);
    const now = new Date();
    return Math.floor((now - publishedDate) / (1000 * 60 * 60 * 24));
}

function calculateTimeDifference(dateString) {
    const lastUpdatedDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now - lastUpdatedDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
    } else {
        return `${diffInDays} days ago`;
    }
}

async function handleUpdate() {
    const button = document.querySelector('.update-button');
    button.classList.add('loading');
    button.disabled = true;
    button.textContent = 'Updating';

    try {
        const newReleaseNotes = [];
        const failedRepos = [];

        for (const repo of watchedRepos) {
            const result = await fetchReleaseNotes(repo);
            if (result.error) {
                failedRepos.push({ repo: result.repo, error: result.error });
            } else {
                newReleaseNotes.push(result);
            }
        }

        cachedData = {
            last_updated: new Date().toISOString(),
            release_notes: newReleaseNotes.sort((a, b) => new Date(b.published_at) - new Date(a.published_at)),
            failed_repos: failedRepos
        };

        saveCache();
        renderContent();

        if (failedRepos.length > 0) {
            showErrorDialog(failedRepos);
        }
    } catch (error) {
        console.error('Error during update:', error);
        alert('An error occurred while updating. Please try again.');
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Check for Updates';
    }
}

function showErrorDialog(failedRepos) {
    let message = "Failed to update the following repositories:\n\n";
    failedRepos.forEach(({ repo, error }) => {
        message += `${repo}: ${error}\n`;
    });
    message += "\nPossible solutions:\n";
    message += "1. Check if the repository names are correct.\n";
    message += "2. Ensure you have an active internet connection.\n";
    message += "3. The repository might not have any releases yet.\n";
    message += "4. There might be a temporary issue with GitHub's API.\n";
    message += "5. If the error persists, try again later or remove the problematic repository.";

    alert(message);
}

function renderContent() {
    document.getElementById('loading-message').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    const lastUpdated = cachedData.last_updated ? new Date(cachedData.last_updated).toLocaleString() : 'Never';
    const timeDifference = cachedData.last_updated ? calculateTimeDifference(cachedData.last_updated) : '';
    document.getElementById('last-updated').textContent = `${lastUpdated} (${timeDifference})`;

    const toc = document.getElementById('toc');
    const releases = document.getElementById('releases');
    toc.innerHTML = '';
    releases.innerHTML = '';

    for (const release of cachedData.release_notes || []) {
        const tocItem = document.createElement('li');
        tocItem.innerHTML = `<a href="#${release.repo}-${release.version}" title="${release.published_at}">${release.age_in_days} days ago - ${release.repo} - ${release.version}</a>`;
        toc.appendChild(tocItem);

        const releaseDiv = document.createElement('div');
        releaseDiv.className = 'release';
        releaseDiv.id = `${release.repo}-${release.version}`;

        let bodyHtml;
        try {
            // Use DOMPurify to sanitize the HTML output from marked
            bodyHtml = DOMPurify.sanitize(marked.parse(release.body));
        } catch (error) {
            console.warn('Error parsing Markdown:', error);
            bodyHtml = DOMPurify.sanitize(release.body); // Fallback to sanitized plain text
        }

        releaseDiv.innerHTML = `
            <h2><a href="https://github.com/${release.repo}/releases/tag/${release.version}" target="_blank">${release.repo} - ${release.version}</a></h2>
            <p class="date">Published on: <span title="${release.published_at}">${release.age_in_days} days ago</span></p>
            <div class="release-body">${bodyHtml}</div>
        `;
        releases.appendChild(releaseDiv);
    }
}

function showSettings() {
    document.getElementById('content').style.display = 'none';
    document.getElementById('settings').style.display = 'block';
    document.getElementById('repos-list').value = watchedRepos.join('\n');
}

function saveSettings() {
    const reposList = document.getElementById('repos-list').value;
    watchedRepos = reposList.split('\n').filter(repo => repo.trim() !== '').map(repo => {
        const match = repo.match(/https:\/\/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : repo;
    });
    localStorage.setItem('watchedRepos', watchedRepos.join('\n'));
    document.getElementById('settings').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    handleUpdate();
}

function cancelSettings() {
    document.getElementById('settings').style.display = 'none';
    document.getElementById('content').style.display = 'block';
}

function clearCache() {
    localStorage.removeItem('releaseNotesCache');
    cachedData = {};
    renderContent();
    alert('Cache cleared. Click "Check for Updates" to fetch fresh data.');
}

window.addEventListener('DOMContentLoaded', (event) => {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }
    init();
});
