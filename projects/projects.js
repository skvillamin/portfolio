import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Fetch project data
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// Create a fixed color scale based on the year values
const colorScale = d3.scaleOrdinal()
  .domain(projects.map(project => project.year))
  .range([
  "#A8D5BA",
  "#FFE29A",
  "#FFB3AB",
  "#B5C7E3",
  "#AED9E0"
]);;

let selectedIndex = -1;
let query = '';

// Sort projects by year (descending, numeric) and then by title (optional, for tie-breaker)
projects.sort((a, b) => {
  if (parseInt(b.year) !== parseInt(a.year)) {
    return parseInt(b.year) - parseInt(a.year);
  }
  return b.title.localeCompare(a.title);
});

// Function to render the pie chart and 
function renderPieChart(projectsGiven) {
  // Clear existing paths and legend items
  let svg = d3.select('svg');
  svg.selectAll('path').remove();
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // Re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  // Sort legend years descending (latest first)
  newRolledData.sort((a, b) => parseInt(b[0]) - parseInt(a[0]));

  // Re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // Assign color for each year in sorted order
  const legendColors = [
    "#A8D5BA",
    "#FFE29A",
    "#FFB3AB",
    "#B5C7E3",
    "#AED9E0"
  ];

  // Map year to color based on sorted order
  const yearToColor = {};
  newData.forEach((d, idx) => {
    yearToColor[d.label] = legendColors[idx % legendColors.length];
  });

  // Re-calculate slice generator, arc data, arc, etc.
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(newData);
  let arcs = arcData.map((d) => arcGenerator(d));

  arcs.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', yearToColor[newData[i].label])
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        updateSelection();
      });
  });

  // Update legend
  newData.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color:${yearToColor[d.label]}`)
      .attr('class', idx === selectedIndex ? 'selected' : '')
      .html(`<span class="swatch"></span> <span class="year-label">${d.label}</span> <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        updateSelection();
      });
  });
}

// Function to update the selection state
function updateSelection() {
  let svg = d3.select('svg');
  svg.selectAll('path')
    .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

  let legend = d3.select('.legend');
  legend.selectAll('li')
    .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

  // Filter projects based on selection
  let filteredProjects;
  if (selectedIndex === -1) {
    filteredProjects = projects.filter(project => 
      Object.values(project).join('\n').toLowerCase().includes(query)
    );
  } else {
    let selectedYear = d3.rollups(projects, v => v.length, d => d.year)[selectedIndex][0];
    filteredProjects = projects.filter(project => 
      project.year === selectedYear && 
      Object.values(project).join('\n').toLowerCase().includes(query)
    );
  }

  renderProjects(filteredProjects, projectsContainer, 'h2');
}

// Function to filter and render projects based on search query
function filterAndRenderProjects() {
  let filteredProjects = projects.filter((project) => {
    return Object.values(project).join('\n').toLowerCase().includes(query);
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
}

// Call this function on page load
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);

// Add search functionality
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  selectedIndex = -1;
  filterAndRenderProjects();
});

function createProjectCard(project) {
  if (project.url) {
    return `
      <a href="${project.url}" target="_blank" class="project-link" style="text-decoration:none;color:inherit;display:block;">
        <article>
          <h2>${project.title}</h2>
          <p class="year">${project.year}</p>
          <img src="${project.image}" alt="${project.title}">
          <p class="description">${project.description}</p>
        </article>
      </a>
    `;
  } else {
    return `
      <article>
        <h2>${project.title}</h2>
        <p class="year">${project.year}</p>
        <img src="${project.image}" alt="${project.title}">
        <p class="description">${project.description}</p>
      </article>
    `;
  }
}