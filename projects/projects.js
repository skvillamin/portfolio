import { fetchJSON, renderProjects } from '../global.js';

// Use the globally loaded d3 instead of importing it again
// const d3 is already available from the script tag

console.log('D3 version:', d3.version);
console.log('Starting projects.js...');

// Fetch project data
let projects = await fetchJSON('../lib/projects.json');
console.log('Loaded projects:', projects);

// Fallback data in case projects.json doesn't load
if (!projects || projects.length === 0) {
  console.log('No projects loaded, using fallback data');
  projects = [
    { title: "Sample Project 1", year: "2024", description: "A sample project", image: "" },
    { title: "Sample Project 2", year: "2023", description: "Another sample project", image: "" },
    { title: "Sample Project 3", year: "2024", description: "Third sample project", image: "" }
  ];
}

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// Create a fixed color scale based on the year values
const colorScale = d3.scaleOrdinal()
  .domain(projects.map(project => project.year))
  .range(d3.schemeTableau10);

let selectedIndex = -1;
let query = '';

// Function to render the pie chart and legend
function renderPieChart(projectsGiven) {
  console.log('renderPieChart called with:', projectsGiven);
  
  // Clear existing paths and legend items
  let svg = d3.select('svg');
  console.log('SVG element found:', svg.node());
  svg.selectAll('path').remove();
  let legend = d3.select('.legend');
  console.log('Legend element found:', legend.node());
  legend.selectAll('li').remove();

  // Re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  // Re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // Re-calculate slice generator, arc data, arc, etc.
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(newData);
  let arcs = arcData.map((d) => arcGenerator(d));

  arcs.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', colorScale(newData[i].label))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        updateSelection();
      });
  });

  // Update legend
  newData.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color:${colorScale(d.label)}`)
      .attr('class', idx === selectedIndex ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
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

// Call this function on page load to render the initial pie chart
console.log('Calling renderPieChart with projects:', projects);
renderPieChart(projects);

// Add search functionality
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  selectedIndex = -1;
  filterAndRenderProjects();
});

function createProjectCard(project) {
  return `
      <div class="project-card">
          ${project.url 
              ? `<a href="${project.url}" target="_blank">${project.title}</a>`
              : `<span>${project.title}</span>`
          }
          <p class="year">${project.year}</p>
          <img src="${project.image}" alt="${project.title}">
          <p class="description">${project.description}</p>
      </div>
  `;
}