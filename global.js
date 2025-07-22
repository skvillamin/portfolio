console.log('IT’S ALIVE!');
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const ARE_WE_HOME = document.documentElement.classList.contains('home');

// // Define pages array
// let pages = [];

// let nav = document.createElement('nav');

// for (let p of pages) {
//   let url = p.url;
//   let title = p.title;

//   url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;

//   let a = document.createElement('a');
//   a.href = url;
//   a.textContent = title;

//   if (a.host === location.host && a.pathname === location.pathname) {
//     a.classList.add('current');
//   }

//   if (a.host !== location.host) {
//     a.target = '_blank';
//   }

//   nav.append(a);
// }

// document.body.prepend(nav);

// function setColorScheme(colorScheme) {
//     document.documentElement.style.setProperty('color-scheme', colorScheme);
//     localStorage.colorScheme = colorScheme;
// }

// document.body.insertAdjacentHTML(
//     'afterbegin',
//     `
//       <label class="color-scheme">
//         Theme:
//         <select>
//           <!-- The values here match the CSS color-scheme property exactly -->
//           <option value="light dark" selected>Automatic</option>
//           <option value="light">Light</option>
//           <option value="dark">Dark</option>
//         </select>
//       </label>
//     `
//   );
  
// const select = document.querySelector('.color-scheme select');


// if ("colorScheme" in localStorage) {
//     select.value = localStorage.colorScheme;
//     document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
//   } else {
//     select.value = "light dark";
//   }

//   select.addEventListener('input', function (event) {
//     setColorScheme(event.target.value);
//   });

export async function fetchJSON(url, options = {}) {
  try {
      const response = await fetch(url, options);
      if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      return await response.json();
  } catch (error) {
      console.error('Error fetching data:', error);
  }
}


export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
      console.error("Invalid container element provided.");
      return;
  }

  containerElement.innerHTML = '';

  if (projects.length === 0) {
      containerElement.innerHTML = '<p>No projects available.</p>';
      return;
  }


  projects.forEach(project => {
    const article = document.createElement('article');
    article.innerHTML = `
        <${headingLevel}>
            ${project.url 
                ? `<a href="${project.url}" target="_blank" rel="noopener noreferrer">${project.title}</a>`
                : project.title
            }
        </${headingLevel}>
        <div class="project-info">
            <p>${project.description}</p>
            ${project.year ? `<p class="project-year">${project.year}</p>` : ''}
        </div>
    `;
    containerElement.appendChild(article);
});
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}