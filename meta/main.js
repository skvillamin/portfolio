const width = 1000;
const height = 600;
let xScale, yScale; // Add these at the top

function createScatterplot(){
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');


    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);
    
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue');

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
      
      // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
  
  // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);
    
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3
        .scaleSqrt() // Change only this line
        .domain([minLines, maxLines])
        .range([2, 30]);

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))  // Use rScale here instead of fixed value 5
        .attr('fill', 'green')
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', (event, d) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
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

function displayStats() {
    // Process commits first
    processCommits();
  
    // Create the dl element
    const dl = d3.select('#stats')
      .append('dl')
      .attr('class', 'stats');
  
    // 1) Total LOC
    let container = dl.append('div').attr('class', 'stat-block');
    container.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    container.append('dd').text(data.length);
  
    // 2) Total commits
    container = dl.append('div').attr('class', 'stat-block');
    container.append('dt').text('Total commits');
    container.append('dd').text(commits.length);
  
    // 3) Number of unique files
    const uniqueFiles = new Set(data.map(d => d.file)).size;
    container = dl.append('div').attr('class', 'stat-block');
    container.append('dt').text('Number of files');
    container.append('dd').text(uniqueFiles);
  
    // 4) Average file length
    const fileLengths = d3.rollups(
      data,
      (v) => d3.max(v, (d) => d.line),
      (d) => d.file
    );
    const averageFileLength = d3.mean(fileLengths, (d) => d[1]);
    container = dl.append('div').attr('class', 'stat-block');
    container.append('dt').text('Average File Length');
    container.append('dd').text(averageFileLength);
  
    // 5) Most active time
    const workByPeriod = d3.rollups(
      data,
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
            configurable: true,  // Allow the property to be deleted or reconfigured
            writable: true,      // Allow the value to be changed
            enumerable: true 
        });
  
        return ret;
      });
  }

let brushSelection = null;

  function brushed(event) {
      brushSelection = event.selection;
      updateSelection();
      updateSelectionCount();
      updateLanguageBreakdown();
  }
  
  function isCommitSelected(commit) {
      if (!brushSelection) return false;
      
      const [[x0, y0], [x1, y1]] = brushSelection;
      const cx = xScale(commit.datetime);
      const cy = yScale(commit.hourFrac);
      
      return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
  }
  
  function updateSelection() {
      d3.selectAll('circle')
          .classed('selected', d => isCommitSelected(d))
          .style('fill-opacity', d => isCommitSelected(d) ? 1 : 0.3);
  }

  function updateSelectionCount() {
    const selectedCommits = brushSelection
      ? commits.filter(isCommitSelected)
      : [];
  
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

function updateLanguageBreakdown() {
  const selectedCommits = brushSelection
    ? commits.filter(isCommitSelected)
    : [];
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

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));

    displayStats();
    createScatterplot();
    brushSelector();

}
  

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});

