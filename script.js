// Google Sheet CSV URLs (published)
const INDUSTRY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgrfaHxtRg4QtJoou7aFJAjuuhVqfKGBJzOPQ0mWRBRCq_zfm6PmvnaAaowzKe99DGI45rykSD5rzs/pub?gid=1730428013&single=true&output=csv";
const COMPANY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgrfaHxtRg4QtJoou7aFJAjuuhVqfKGBJzOPQ0mWRBRCq_zfm6PmvnaAaowzKe99DGI45rykSD5rzs/pub?gid=0&single=true&output=csv";
const UPLOAD_API_URL = "http://35.184.50.162:7860/api/v1/run/b2e2aa19-b210-464b-8690-0438557ea86b?stream=false";
// const UPLOAD_API_URL = "http://127.0.0.1:7861/api/v1/run/6f869a3a-10bb-4248-b741-b998b0ca6ce9?stream=false";

// DOM elements
const fetchIndustryBtn = document.getElementById("fetchIndustryBtn");
const industrySelect = document.getElementById("industrySelect");
const fetchCompaniesBtn = document.getElementById("fetchCompaniesBtn");
const companyList = document.getElementById("companyList");
const uploadCompaniesBtn = document.getElementById("uploadCompaniesBtn");
const uploadResult = document.getElementById("uploadResult");

// CSV Parsing helpers
function parseCSV(csvText) {
    const rows = [];
    const lines = csvText.trim().split("\n");
    const headers = parseCSVRow(lines[0]);

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        const obj = {};
        headers.forEach((h, j) => {
            obj[h] = row[j] || "";
        });
        rows.push(obj);
    }

    return rows;
}

function parseCSVRow(row) {
    const result = [];
    let insideQuote = false;
    let value = "";

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];

        if (char === '"' && insideQuote && nextChar === '"') {
            value += '"';
            i++; // skip escaped quote
        } else if (char === '"') {
            insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
            result.push(value.trim());
            value = "";
        } else {
            value += char;
        }
    }

    result.push(value.trim());
    return result;
}

// State
let currentCompanies = [];
const industryMap = new Map();

// Fetch industry list
fetchIndustryBtn.addEventListener("click", async () => {
    try {

        industryLoading.classList.remove("hidden");
        fetchIndustryBtn.disabled = true;

        const res = await fetch(INDUSTRY_CSV_URL);
        const text = await res.text();

        console.log("[CSV RAW TEXT]", text);
        const data = parseCSV(text);        

        industrySelect.innerHTML = '<option value="">-- Select Industry --</option>';
        industryMap.clear();

        data.forEach(row => {
            const opt = document.createElement("option");
            opt.value = row.industry_id;
            opt.textContent = row.industry_name;
            industrySelect.appendChild(opt);
            industryMap.set(row.industry_id, row.industry_name);
        });

        industrySelectContainer.classList.remove("hidden");
    } catch (err) {
        alert("Failed to fetch industries: " + err.message);
    }finally {
        industryLoading.classList.add("hidden");
        fetchIndustryBtn.disabled = false;
    }
});

// Fetch companies from Sheet1 based on selected industry
fetchCompaniesBtn.addEventListener("click", async () => {

    const industryId = industrySelect.value;
    const industryName = industryMap.get(industryId);
    currentCompanies = [];

    if (!industryId || !industryName) return alert("Select industry first");

    try {

        // Show loading indicator
        companyLoading.classList.remove("hidden");
        fetchCompaniesBtn.disabled = true;
        
        noCompanyMessage.classList.add("hidden");
        const res = await fetch(COMPANY_CSV_URL);
        const text = await res.text();
        const data = parseCSV(text);

        const companies = data.filter(row => row.industry_id === industryId);
        currentCompanies = companies;

        companyList.innerHTML = "";
        companies.forEach(c => {
            const div = document.createElement("div");
            div.className = "company-card";
            div.innerHTML = `
                <h3>${c.company_name}</h3>
                <p><strong>Industry:</strong> ${c.industry_name}</p>
                <p><strong>Industry ID:</strong> ${c.industry_id}</p>
                <p><a href="${c.company_url}" target="_blank">View Company</a></p>
                ${c.pdf_url ? `<p><a href="${c.pdf_url}" target="_blank">View PDF</a></p>` : ""}
            `;
            companyList.appendChild(div);
        });

        companyContainer.classList.remove("hidden");
    } catch (err) {
        alert("Failed to fetch company data: " + err.message);
    }finally {
                companyLoading.classList.add("hidden");
                fetchCompaniesBtn.disabled = false;
            }
});

// Upload to backend
uploadCompaniesBtn.addEventListener("click", async () => {

    uploadLoading.classList.remove("hidden");
    uploadCompaniesBtn.disabled = true;
    uploadResult.classList.add("hidden");

    if (!currentCompanies.length) return alert("No companies loaded");

    const payload = JSON.stringify({ value: currentCompanies });

    console.log(currentCompanies);
    
    const reqBody = {
        output_type: "chat",
        input_type: "chat",
        tweaks: {
            "ChatInput-MULZE": { input_value: payload }
        }
    };

    try {
        const res = await fetch(UPLOAD_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody)
        });


        const data = await res.json();
        uploadResult.innerHTML = `<p class="success-message">Upload successful! Response: ${data.output || "Companies uploaded to database"}</p>`;
        uploadResult.classList.remove("hidden");
    } catch (err) {
        uploadResult.textContent = "❌ Upload failed: " + err.message;
    } finally {
                uploadLoading.classList.add("hidden");
                uploadCompaniesBtn.disabled = false;
            }
});
