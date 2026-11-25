const url= "https://services.nvd.nist.gov/rest/json/cves/2.0";
const ckey= "cyber_watch_data";
const ctime= 10 * 60 * 1000;

const list = document.getElementById("vulnerabilityList");
const status = document.getElementById("statusMessage");
const search = document.getElementById("searchInput");
const filter = document.getElementById("severityFilter");
const sort = document.getElementById("sortSelect");

let vulnerabilities = [];

let severityChart;
let trendChart;
let cvssChart;
const themeButton = document.getElementById("theme-toggle");
function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
        themeButton.textContent = "☾ Dark Mode";
    }
    else {
        themeButton.textContent = "☀ Light Mode";
    }
    localStorage.setItem("cyber_watch_theme", theme);
    updateChartTheme();
}
function updateChartTheme() {
    const styles = getComputedStyle(document.documentElement);

    const textColor = styles.getPropertyValue("--text-color").trim();
    const mutedColor = styles.getPropertyValue("--muted-color").trim();
    const borderColor = styles.getPropertyValue("--border-color").trim();
    const cardColor = styles.getPropertyValue("--card-color").trim();
    const accentColor = styles.getPropertyValue("--accent-color").trim();

    const charts = [severityChart, trendChart, cvssChart];

    charts.forEach(chart => {
        if (!chart) {return;}

        if (chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }

        if (chart.options.scales) {
            Object.values(chart.options.scales).forEach(axis => {
                if (axis.ticks) {
                axis.ticks.color = mutedColor;
                }
                if (axis.grid) {
                    axis.grid.color = borderColor;
                }
            });
        }
    });

    if (severityChart) {
        severityChart.data.datasets[0].borderColor = cardColor;
    }

    if (trendChart) {
        trendChart.data.datasets[0].borderColor = accentColor;
        trendChart.data.datasets[0].bacgroundColor = `${accentColor}26`;
    }

    charts.forEach( chart => {
        if (chart) { 
            chart.update();
        }
    });
}
themeButton.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "light") {
        setTheme("dark");
    }
    else {
        setTheme("light");
    }
});
const savedTheme = localStorage.getItem("cyber_watch_theme") || "dark";
setTheme(savedTheme);
function getScore(cve) {
    const metrics = cve.metrics || {};
    const versions = ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"];

    for (const version of versions) {
        const metric = metrics[version]?.[0];
        if (metric){
            return {score: metric.cvssData.baseScore, severity: metric.cvssData.baseSeverity || metric.baseSeverity || "UNKNOWN"};
        }
    }
    return { score: null, severity: "UNKNOWN" };
}
function getDescription(cve) {
    const description = cve.descriptions?.find(item => item.lang == "en");
    return description?.value || "No description available.";
}
async function loadData(force = false) {
    const cached = localStorage.getItem(ckey);

    if (!force && cached) {
        try {
            const saved = JSON.parse(cached);

            if (Array.isArray(saved.data) && Date.now() - saved.time < ctime) {vulnerabilities = saved.data; displayData(); return;}
        }
        catch {localStorage.removeItem(ckey);}
    }
    status.textContent = "Loading security information...";
    list.innerHTML = "";

    try {
        const endDate = new Date();
        const startDate = new Date();

        startDate.setDate(startDate.getDate() - 120);

        const params = new URLSearchParams({resultsPerPage: 50, pubStartDate: startDate.toISOString(), pubEndDate: endDate.toISOString()});
        const response = await fetch(`${url}?${params}&noRejected`);
        
        if (!response.ok) {
            throw new Error("Sorry!Unable to retrieve vulnerability data.");
        }

        const data = await response.json();

        if (!Array.isArray(data.vulnerabilities)) {
            throw new Error("Invalid API response.");
        }

        vulnerabilities = data.vulnerabilities.map(item => item.cve);

        localStorage.setItem(ckey, JSON.stringify({data: vulnerabilities, time: Date.now()}));

        displayData();
    }
    catch (error) {
        console.error(error);

        status.textContent = "Unable to connect to the security database. Please try again!";

        const saved = localStorage.getItem(ckey);

        if (saved) {
            try {
                const oldData = JSON.parse(saved);

                if (!Array.isArray(oldData.data)) {
                    throw new Error("Invalid cached data.");
                }

                vulnerabilities = oldData.data;
                displayData();

                status.textContent = "Showing saved information. Live updates are unavailable at the moment.";
            }
            catch {
                status.textContent = "Unable to load data. Please refresh the page and try again.";
            }
        }
    }
}
function updateStats(data) {
    const scores = data.map(cve => getScore(cve));
    document.getElementById("totalCount").textContent = data.length;
    document.getElementById("criticalCount").textContent = scores.filter(item => item.severity === "CRITICAL").length;
    document.getElementById("highCount").textContent = scores.filter(item => item.severity === "HIGH").length;
}
function updateSeverityChart() {
    const counts = {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0};
    vulnerabilities.forEach(cve => {
        const severity = getScore(cve).severity;
        if (counts[severity] !== undefined) {
            counts[severity]++;
        }
    });

    const ctx = document.getElementById("severityChart");

    if (severityChart) {
        severityChart.data.datasets[0].data = Object.values(counts);
        severityChart.update();
    }
    else {
        severityChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ["#ff7777", "#ffad75", "#f0ce72", "#72d9a6", "#9ba8bb"],
                    borderColor: "#151f30",
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue("--text-color").trim()
                    }
                }
            }
        }
        });
    }
}
function updateTrendChart() {
    const dailyCounts = {};
    vulnerabilities.forEach(cve => {if (!cve.published) {return;}
    const date = new Date(cve.published);
    const day = date.toISOString().split("T")[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
});
const labels = Object.keys(dailyCounts).sort();
const values = labels.map(day => dailyCounts[day]);
const ctx = document.getElementById("trendChart");
if (trendChart) {
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = values;
    trendChart.update();
}
else {
    trendChart = new Chart(ctx, {type: "line",
        data: {labels: labels, datasets: [{
            label: "Published vulnerabilities",
            data: values,
            borderColor: "#c6a76b",
            backgroundColor: "rgba(198, 167, 107, 0.15)",
            fill: true,
            tension: 0.3
        }]},
        options: {responsive: true, maintainAspectRatio: false,
            plugins: {legend: {labels: {color: getComputedStyle(document.documentElement).getPropertyValue("--text-color").trim()}}
            },
            scales: {x: {ticks: {color: "#9ba8bb"}, grid: {color: "#263248"}}, y: {beginAtZero: true, ticks: {color: "#9ba8bb", precision: 0},grid: {color: "#263248"}}}
        }
    });
}
}
function updateCvssChart() {
    const range = {"0.0 - 3.9":0, "4.0 - 6.9": 0, "7.0 - 8.9": 0, "9.0 - 10.0":0};
    vulnerabilities.forEach(cve => {
        const score = getScore(cve).score;
        if (score === null || score === undefined){
            return;
        }
        if (score <= 3.9) {
            range["0.0 - 3.9"]++;
        }
        else if(score <= 6.9) {
            range["4.0 - 6.9"]++;
        }
        else if (score <= 8.9) {
            range["7.0 - 8.9"]++;
        }
        else if (score <= 10) {
            range["9.0 - 10.0"]++;
        }
    });
    const labels = Object.keys(range);
    const values = Object.values(range);
    const ctx = document.getElementById("cvssChart");
    if (cvssChart) {
        cvssChart.data.datasets[0].data = values;
        cvssChart.update();
    }
    else {
        cvssChart = new Chart(ctx, {type: "bar", data: {labels: labels, datasets: [{label: "number of vulnerabilities",
            data: values, backgroundColor: ["#72d9a6", "#f0ce72", "#ffad75", "#ff7777"], borderRadius: 5
        }]}, options: {responsive: true, maintainAspectRatio: false, plugins: {legend: {labels: {color: getComputedStyle(document.documentElement).getPropertyValue("--text-color").trim()}}}, scales: {x: {ticks: {color: "#9ba8bb"}, grid: {color: "#263248"}}, y: {beginAtZero: true, ticks: {color: "#9ba8bb", precision: 0}, grid: {color:"#263248"}}}}});
    }
}
function displayData() {
    const keyword = search.value.toLowerCase();
    const selected = filter.value;
    let results = vulnerabilities.filter(cve => {const description = getDescription(cve).toLowerCase(); const id = cve.id.toLowerCase(); const severity = getScore(cve).severity; return ((id.includes(keyword) || description.includes(keyword)) && (selected === "all" || severity === selected));});
    results.sort((a, b) => {
        const first = getScore(a).score ?? -1;
        const second = getScore(b).score ?? -1;
        if (sort.value === "score") {
            return second - first;
        }
        if (sort.value === "oldest") {
            return new Date(a.published) - new Date(b.published);
        }
        return new Date(b.published) - new Date(a.published);
    });
    updateStats(vulnerabilities);
    updateSeverityChart();
    updateTrendChart();
    updateCvssChart();
    updateChartTheme();
    list.replaceChildren();
    status.textContent = `${results.length} vulnerabilities found`;
    if (results.length === 0) {
        status.textContent = "No matching vulnerabilities found.";
        return;
    }
    results.forEach(cve => {
        const score = getScore(cve); 
        const card = document.createElement("article"); 
        card.className = "vulnerability"; 
        const title = document.createElement("h3"); 
        title.textContent = cve.id;
        const description = document.createElement("p");
        description.textContent = getDescription(cve);
        const meta = document.createElement("div");
        meta.className = "meta";
        const severity = document.createElement("span");
        severity.className = `severity ${score.severity}`;
        severity.textContent = score.severity;
        const rating = document.createElement("span");
        rating.textContent = score.score === null ? "CVSS : Not available" : `CVSS Score: ${score.score}`;
        const date = document.createElement("span");
        date.textContent = `Published: ${new Date(cve.published).toLocaleDateString()}`;
        const link = document.createElement("a");
        link.href = `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve.id)}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View full vulnerability details ↗";
        
        meta.append(severity, rating, date);
        card.append(title, description, meta, link);
        list.appendChild(card);
        });
}
search.addEventListener("input", displayData);
filter.addEventListener("change", displayData);
sort.addEventListener("change", displayData);
document.getElementById("refreshBtn").addEventListener("click", () => {loadData(true);});
loadData();