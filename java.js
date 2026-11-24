const url= "https://services.nvd.nist.gov/rest/json/cves/2.0";
const ckey= "cyber_watch_data";
const ctime= 10 * 60 * 1000;

const list = document.getElementById("vulnerabilityList");
const status = document.getElementById("statusMessage");
const search = document.getElementById("searchInput");
const filter = document.getElementById("severityFilter");
const sort = document.getElementById("sortSelect");

let vulnerabilities = [];


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