import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
if (projectsContainer) {
    renderProjects(latestProjects, projectsContainer, 'h2');
} else {
    console.error("Error: No container found for displaying latest projects.");
}

const githubData = await fetchGitHubData('skvillamin');
const profileStats = document.querySelector('.profile-stats');

if (profileStats) {
    profileStats.innerHTML = `
        <dl>
            <dt>Public Repos</dt>
            <dt>Public Gists</dt>
            <dt>Followers</dt>
            <dt>Following</dt>
            <dd>${githubData.public_repos}</dd>
            <dd>${githubData.public_gists}</dd>
            <dd>${githubData.followers}</dd>
            <dd>${githubData.following}</dd>
        </dl>
    `;
}