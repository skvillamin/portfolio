const width = 1000;
const height = 600;
let xScale, yScale; // Add these at the top
let selectedCommits = [];
let filteredCommits= [];
let NUM_ITEMS; // Ideally, let this value be the length of your commit history
let ITEM_HEIGHT = 100; // Feel free to change
let VISIBLE_COUNT = 10; // Feel free to change as well
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');
scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  renderItems(startIndex);
});

// Add these variables after your existing scrolly variables
let FILES_NUM_ITEMS; // Will be set based on unique files count
let FILES_ITEM_HEIGHT = 100; // Feel free to adjust
let FILES_VISIBLE_COUNT = 8;
let filesTotalHeight;
let filesScrollActive = false;

// Add these declarations after your existing container declarations
const filesScrollContainer = d3.select('#files-scroll-container');
const filesSpacerElement = d3.select('#files-spacer');
const filesItemsContainer = d3.select('#files-items-container');

// Add this function to initialize the files scrolly
function initFilesScrolly() {
  // Count unique files from all commits
  const allLines = commits.flatMap(d => d.lines);
  const uniqueFiles = Array.from(new Set(allLines.map(d => d.file)));
  FILES_NUM_ITEMS = uniqueFiles.length;
  filesTotalHeight = (FILES_NUM_ITEMS - 1) * FILES_ITEM_HEIGHT;
  
  // Set the spacer height
  filesSpacerElement.style('height', `${filesTotalHeight}px`);
  
  // Set up the scroll event
  filesScrollContainer.on('scroll', () => {
    const scrollTop = filesScrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / FILES_ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, FILES_NUM_ITEMS - FILES_VISIBLE_COUNT));
    renderFileItems(startIndex);
    filesScrollActive = true;
  });
  
  // Initial render
  renderFileItems(0);
}

// Add this function to render file items
function renderFileItems(startIndex) {
  // Get all unique files
  const allLines = commits.flatMap(d => d.lines);
  let allFiles = d3.groups(allLines, d => d.file).map(([name, lines]) => ({ name, lines }));
  allFiles = d3.sort(allFiles, d => -d.lines.length);
  
  // Get visible files for the current scroll position
  const endIndex = Math.min(startIndex + FILES_VISIBLE_COUNT, FILES_NUM_ITEMS);
  const visibleFiles = allFiles.slice(startIndex, endIndex);
  
  // Clear and update the visualization container
  d3.select('.files-viz').selectAll('*').remove();
  displayFileVis(visibleFiles);
  
  // Clear and update the narrative container
  filesItemsContainer.selectAll('div').remove();
  
  // Add narrative elements for each file
  filesItemsContainer.selectAll('div')
    .data(visibleFiles)
    .enter()
    .append('div')
    .style('position', 'absolute')
    .style('width', '100%')
    .style('padding', '10px')
    .style('box-sizing', 'border-box')
    .style('top', (_, idx) => `${idx * FILES_ITEM_HEIGHT}px`)
    .append('p')
    .style('margin', '0')
    .html(d => `
      <strong>${d.name}</strong> contains ${d.lines.length} lines of code.
      This file represents ${(d.lines.length / allLines.length * 100).toFixed(1)}% of the total codebase.
      Understanding file size distribution helps identify complex or overgrown components.
    `);
}

// Add this function to display the file visualization
function displayFileVis(files) {
  const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  
  d3.select('.files-viz').selectAll('div').remove();
  let filesContainer = d3.select('.files-viz')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div');
  
  filesContainer.append('dt')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  
  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));
}


function renderItems(startIndex) {
  // Clear things off
  itemsContainer.selectAll('div').remove();
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let newCommitSlice = commits.slice(startIndex, endIndex);
  updateScatterplot(newCommitSlice);
  displayCommitFiles();

  // Re-bind the commit data to the container and represent each using a div
  itemsContainer.selectAll('div')
    .data(newCommitSlice)
    .enter()
    .append('div')
    .style('position', 'absolute')
    .style('width', '100%')  // Add this to ensure full width
    .style('padding', '10px')  // Add padding for better spacing
    .style('box-sizing', 'border-box')  // Include padding in height calculation
    .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)  // Position each item
    .append('p')
    .style('margin', '0')  // Remove default paragraph margins
    .html(d => `
      On ${d.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})}, I made
      <a href="${d.url}" target="_blank">
        ${d.index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
      </a>. I edited ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length} files. Then I looked over all I had made, and
      I saw that it was very good.
    `);
}



function updateScatterplot(filteredCommits) {
  // Only create SVG if it doesn't exist
  let svg = d3.select('#chart svg');
  if (svg.empty()) {
      svg = d3.select('#chart')
          .append('svg')
          .attr('viewBox', `0 0 ${width} ${height}`)
          .style('overflow', 'visible');

      const margin = { top: 10, right: 10, bottom: 30, left: 20 };
      const usableArea = {
          top: margin.top,
          right: width - margin.right,
          bottom: height - margin.bottom,
          left: margin.left,
          width: width - margin.left - margin.right,
          height: height - margin.top - margin.bottom,
      };

      xScale = d3.scaleTime()
          .range([usableArea.left, usableArea.right]);

      yScale = d3.scaleLinear()
          .domain([0, 24])
          .range([usableArea.bottom, usableArea.top]);

      // Add container for dots
      svg.append('g').attr('class', 'dots');

      // Add gridlines
      const gridlines = svg
          .append('g')
          .attr('class', 'gridlines')
          .attr('transform', `translate(${usableArea.left}, 0)`);
      
      gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

      // Add axes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale)
          .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

      svg.append('g')
          .attr('class', 'x-axis')
          .attr('transform', `translate(0, ${usableArea.bottom})`)
          .call(xAxis);

      svg.append('g')
          .attr('class', 'y-axis')
          .attr('transform', `translate(${usableArea.left}, 0)`)
          .call(yAxis);
  }
  xScale.domain(d3.extent(filteredCommits, d => d.datetime));

  // Update axes
  svg.select('.x-axis').transition().duration(200).call(d3.axisBottom(xScale));

  // Update radius scale
  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
      .domain([minLines, maxLines])
      .range([2, 30]);

  // Update circles with transition
  const dots = svg.select('.dots')
      .selectAll('circle')
      .data(filteredCommits, d => d.id);

  // Remove dots no longer in the data
  dots.exit().remove();

  // Add new dots
  const dotsEnter = dots.enter()
      .append('circle')
      .attr('fill', 'green')
      .style('fill-opacity', 0.7);

  // Update all dots with transition
  dots.merge(dotsEnter)
      .transition()
      .duration(200)
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines));

  // Add event listeners
  dots.merge(dotsEnter)
      .on('mouseenter', (event, d) => {
          d3.select(event.currentTarget)
              .style('fill-opacity', 1)
              .classed('selected', true);
          updateTooltipContent(d);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
      })
      .on('mouseleave', (event) => {
          d3.select(event.currentTarget)
              .style('fill-opacity', 0.7)
              .classed('selected', false);
          updateTooltipVisibility(false);
      });
}

function brushSelector() {
    const svg = document.querySelector('svg');
    // Create brush with event listener
    d3.select(svg).call(
        d3.brush()
            .extent([[0, 0], [width, height]])
            .on('start brush end', brushed)
    );

    // Raise dots and everything after overlay
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id.slice(0, 7); // Show first 7 characters of commit hash
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full'
    });
    time.textContent = commit.datetime?.toLocaleString('en', {
        timeStyle: 'short'
    });
    author.textContent = commit.author;
    lines.textContent = `${commit.totalLines} lines`;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
  }

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }



let data = [];

function displayStats(filteredCommits = commits) {
  // Clear existing stats
  d3.select('#stats').selectAll('*').remove();
  
  // Create the dl element
  const dl = d3.select('#stats')
      .append('dl')
      .attr('class', 'stats');

  // Get lines from filtered commits
  const filteredLines = filteredCommits.flatMap(d => d.lines);
  
  // 1) Total LOC
  let container = dl.append('div').attr('class', 'stat-block');
  container.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  container.append('dd').text(filteredLines.length);

  // 2) Total commits
  container = dl.append('div').attr('class', 'stat-block');
  container.append('dt').text('Total commits');
  container.append('dd').text(filteredCommits.length);

  // 3) Number of unique files
  const uniqueFiles = new Set(filteredLines.map(d => d.file)).size;
  container = dl.append('div').attr('class', 'stat-block');
  container.append('dt').text('Number of files');
  container.append('dd').text(uniqueFiles);

  // 4) Average file length
  const fileLengths = d3.rollups(
      filteredLines,
      (v) => d3.max(v, (d) => d.line),
      (d) => d.file
  );
  const averageFileLength = Math.round(
      d3.mean(Array.from(fileLengths), ([_, length]) => length) || 0
  );
  container = dl.append('div').attr('class', 'stat-block');
  container.append('dt').text('Average File Length');
  container.append('dd').text(averageFileLength);

  // 5) Most active time
  const workByPeriod = d3.rollups(
      filteredLines,
      (v) => v.length,
      (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
  container = dl.append('div').attr('class', 'stat-block');
  container.append('dt').text('Most active time');
  container.append('dd').text(maxPeriod);
}
  

function processCommits() {
  commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
          value: lines,
          configurable: true,
          writable: true,      
          enumerable: true 
      });

      return ret;
    })
    // Add this sort to arrange commits by date
    .sort((a, b) => d3.ascending(a.datetime, b.datetime));
    NUM_ITEMS= commits.length;
}
let brushSelection = null;

function brushed(event) {
  const brushSelection = event.selection;
  selectedCommits = !brushSelection
      ? []
      : commits.filter((commit) => {
          const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
          const max = { x: brushSelection[1][0], y: brushSelection[1][1] };
          const x = xScale(commit.datetime);
          const y = yScale(commit.hourFrac);

          return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
      });
  
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

  
  function updateSelection() {
      d3.selectAll('circle')
          .classed('selected', d => isCommitSelected(d))
          .style('fill-opacity', d => isCommitSelected(d) ? 1 : 0.3);
  }

  function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
    return selectedCommits;
}

function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
  }

  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }

  return breakdown;
}

function displayCommitFiles() {
  const lines = filteredCommits.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
    return { name, lines };
  });
  files = d3.sort(files, (d) => -d.lines.length);
  d3.select('.files').selectAll('div').remove();
  let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
  filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  filesContainer.append('dd')
                .selectAll('div')
                .data(d => d.lines)
                .enter()
                .append('div')
                .attr('class', 'line')
                .style('background', d => fileTypeColors(d.type));
}

function updateFileList(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
      .groups(lines, (d) => d.file)
      .map(([name, lines]) => {
          return { name, lines };
      });

  files = d3.sort(files, (a, b) => b.lines.length - a.lines.length);

  d3.select('.files').selectAll('div').remove();
  let filesContainer = d3.select('.files')
      .selectAll('div')
      .data(files)
      .enter()
      .append('div');

  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

  // Remove the background styling from the filename
  filesContainer.append('dt')
      .append('code')
      .html(d => `${d.name}<small>${d.lines.length} lines</small>`);

  // Only apply colors to the dots
  filesContainer.append('dd')
      .selectAll('div')
      .data(d => d.lines)
      .enter()
      .append('div')
      .attr('class', 'line')
      .style('background', d => fileTypeColors(d.type));
}

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));

    processCommits(); // Add this line
    displayStats();
    updateScatterplot(filteredCommits); // Change commits to filteredCommits
    renderItems(0);
    brushSelector();
    displayCommitFiles();

    initFilesScrolly();
}
  


document.addEventListener('DOMContentLoaded', async () => {
await loadData();
});

