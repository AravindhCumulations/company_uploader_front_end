// Google Sheet CSV URLs (published)
const INDUSTRY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgrfaHxtRg4QtJoou7aFJAjuuhVqfKGBJzOPQ0mWRBRCq_zfm6PmvnaAaowzKe99DGI45rykSD5rzs/pub?gid=1730428013&single=true&output=csv"
const COMPANY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgrfaHxtRg4QtJoou7aFJAjuuhVqfKGBJzOPQ0mWRBRCq_zfm6PmvnaAaowzKe99DGI45rykSD5rzs/pub?gid=0&single=true&output=csv"

// API URLs - Replace with your actual endpoints
// const GENERATE_REPORT_API_URL = "http://127.0.0.1:7860/api/v1/run/2976b24f-fc2b-42b0-a6e3-e4228e394740?stream=false"
const GENERATE_REPORT_API_URL = "http://35.184.50.162:7860/api/v1/run/a70bcefd-9035-4e98-ae26-cd98363e2438?stream=false"

//send attachement
// const SEND_EMAIL_API_URL = "http://127.0.0.1:7860/api/v1/run/d50e907c-5de2-4b86-8a47-5cab10adb67a?stream=false"
const SEND_EMAIL_API_URL = "http://35.184.50.162:7860/api/v1/run/24f18421-8b69-4ed6-b98d-39c5ae2404b5?stream=false"

//send only mail
// const SEND_EMAIL_API_URL = "http://35.184.50.162:7860/api/v1/run/928c6ea1-9058-4adb-8614-f8dcad9eb98a?stream=false"

// const GENERATE_PDF_REPORT = "http://127.0.0.1:7860/api/v1/run/d5d433dd-a42f-49b5-9235-075abf871f49?stream=false"
const GENERATE_PDF_REPORT = "http://35.184.50.162:7860/api/v1/run/5e838d3e-86d4-4308-b251-4786cd6310aa?stream=false"


// DOM elements
const fetchIndustryBtn = document.getElementById("fetchIndustryBtn")
const industryLoading = document.getElementById("industryLoading")
const industrySelectContainer = document.getElementById("industrySelectContainer")
const industrySelect = document.getElementById("industrySelect")
const fetchCompaniesBtn = document.getElementById("fetchCompaniesBtn")
const companyLoading = document.getElementById("companyLoading")
const companyContainer = document.getElementById("companyContainer")
const companyList = document.getElementById("companyList")
const generateReportBtn = document.getElementById("generateReportBtn")
const reportLoading = document.getElementById("reportLoading")
const selectedCount = document.getElementById("selectedCount")
const reportContainer = document.getElementById("reportContainer")
const reportContent = document.getElementById("reportContent")
const emailContainer = document.getElementById("emailContainer")
const emailList = document.getElementById("emailList")
const emailPrompt = document.getElementById("emailPrompt")
const sendEmailBtn = document.getElementById("sendEmailBtn")
const emailLoading = document.getElementById("emailLoading")
const emailResult = document.getElementById("emailResult")
const noCompanyMessage = document.getElementById("noCompanyMessage")

// CSV Parsing helpers
function parseCSV(csvText) {
  const rows = []
  const lines = csvText.trim().split("\n")
  const headers = parseCSVRow(lines[0])

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i])
    const obj = {}
    headers.forEach((h, j) => {
      obj[h] = row[j] || ""
    })
    rows.push(obj)
  }

  return rows
}

function parseCSVRow(row) {
  const result = []
  let insideQuote = false
  let value = ""

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]

    if (char === '"' && insideQuote && nextChar === '"') {
      value += '"'
      i++ // skip escaped quote
    } else if (char === '"') {
      insideQuote = !insideQuote
    } else if (char === "," && !insideQuote) {
      result.push(value.trim())
      value = ""
    } else {
      value += char
    }
  }

  result.push(value.trim())
  return result
}

// State
let currentCompanies = []
const selectedCompanies = new Set()
let currentReport = null
const selectedEmails = new Set()
let pdfLink = null
const industryMap = new Map()

// Fetch industry list
fetchIndustryBtn.addEventListener("click", async () => {
  try {
    industryLoading.classList.remove("hidden")
    fetchIndustryBtn.disabled = true

    const res = await fetch(INDUSTRY_CSV_URL)
    const text = await res.text()
    const data = parseCSV(text)

    industrySelect.innerHTML = '<option value="">-- Select Industry --</option>'
    industryMap.clear()

    data.forEach((row) => {
      const opt = document.createElement("option")
      opt.value = row.industry_id
      opt.textContent = row.industry_name
      industrySelect.appendChild(opt)
      industryMap.set(row.industry_id, row.industry_name)
    })

    industrySelectContainer.classList.remove("hidden")
  } catch (err) {
    alert("Failed to fetch industries: " + err.message)
  } finally {
    industryLoading.classList.add("hidden")
    fetchIndustryBtn.disabled = false
  }
})

// Fetch companies from Sheet1 based on selected industry
fetchCompaniesBtn.addEventListener("click", async () => {
  const industryId = industrySelect.value
  const industryName = industryMap.get(industryId)
  currentCompanies = []
  selectedCompanies.clear()

  if (!industryId || !industryName) return alert("Select industry first")

  try {
    companyLoading.classList.remove("hidden")
    fetchCompaniesBtn.disabled = true
    noCompanyMessage.classList.add("hidden")

    const res = await fetch(COMPANY_CSV_URL)
    const text = await res.text()
    const data = parseCSV(text)

    const companies = data.filter((row) => row.industry_id === industryId)
    currentCompanies = companies

    renderCompanies()
    companyContainer.classList.remove("hidden")

    // Hide report and email sections
    reportContainer.classList.add("hidden")
    emailContainer.classList.add("hidden")
  } catch (err) {
    alert("Failed to fetch company data: " + err.message)
  } finally {
    companyLoading.classList.add("hidden")
    fetchCompaniesBtn.disabled = false
  }
})

// Render companies with checkboxes
function renderCompanies() {
  companyList.innerHTML = ""

  currentCompanies.forEach((company) => {
    const div = document.createElement("div")
    div.className = "company-card"
    div.innerHTML = `
            <input type="checkbox" class="company-checkbox" data-company="${company.company_name}" 
                   ${selectedCompanies.has(company.company_name) ? "checked" : ""}>
            <h3>${company.company_name}</h3>
            <p><strong>Industry:</strong> ${company.industry_name}</p>
            <p><strong>Industry ID:</strong> ${company.industry_id}</p>
            <p><a href="${company.company_url}" target="_blank">View Company</a></p>
            ${company.pdf_url ? `<p><a href="${company.pdf_url}" target="_blank">View PDF</a></p>` : ""}
        `

    // Add event listener for checkbox
    const checkbox = div.querySelector(".company-checkbox")
    checkbox.addEventListener("change", (e) => {
      const companyName = e.target.dataset.company
      if (e.target.checked) {
        selectedCompanies.add(companyName)
        div.classList.add("selected")
      } else {
        selectedCompanies.delete(companyName)
        div.classList.remove("selected")
      }
      updateSelectedCount()
    })

    if (selectedCompanies.has(company.company_name)) {
      div.classList.add("selected")
    }

    companyList.appendChild(div)
  })

  updateSelectedCount()
}

// Update selected count display
function updateSelectedCount() {
  if (selectedCompanies.size > 0) {
    selectedCount.textContent = `${selectedCompanies.size} companies selected`
    selectedCount.classList.remove("hidden")
    generateReportBtn.classList.remove("hidden")
    generateReportBtn.querySelector("span").textContent = `Generate AIRSA Report (${selectedCompanies.size} companies)`
  } else {
    selectedCount.classList.add("hidden")
    generateReportBtn.classList.add("hidden")
  }
}

// Generate AIRSA Report
generateReportBtn.addEventListener("click", async () => {
  if (selectedCompanies.size === 0) return

  try {
    reportLoading.classList.remove("hidden")
    generateReportBtn.disabled = true

    const selectedCompanyData = currentCompanies.filter((company) => selectedCompanies.has(company.company_name))

    // const payload = JSON.stringify({
    //   companies: selectedCompanyData,
    //   action: "generate_airsa_report",
    // })

    const payload = JSON.stringify({ value: selectedCompanyData[0] })

    const reqBody = {
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        "ChatInput-HDGra": { input_value: payload },
      },
    }

    const response = await fetch(GENERATE_REPORT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    })

    const data = await response.json()

    // generate pdf

    const payloadPdf = JSON.stringify({ value: selectedCompanyData[0] })

    const reqBodyPdf = {
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        "ChatInput-ZPAgf": { input_value: payloadPdf },
      },
    }

    const responsePdf = await fetch(GENERATE_PDF_REPORT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBodyPdf),
    })

    const dataPdf = await responsePdf.json()


    // Parse the response - assuming the API returns the report in the expected format
    let reportData
    try {
      const nestedMessage = data?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message

      const pdfNestedMessage = dataPdf?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message


      if (pdfNestedMessage) {
        try {
          // Match any URL in the message using a generic regex
          const urlRegex = /(https?:\/\/[^\s"]+)/;
          const match = pdfNestedMessage.match(urlRegex);

          if (match && match[0]) {
            pdfLink = match[0];
            // You can now use pdfLink here (e.g., set state, open link, etc.)
          } else {
            console.warn("⚠️ No valid PDF link found in message.");
          }
        } catch (error) {
          console.error("❌ Error while extracting PDF link:", error);
        }
      }

      if (!nestedMessage) throw new Error("No message in response")

      reportData = JSON.parse(nestedMessage)
    } catch (e) {
      console.error("Failed to parse response:", e)
      throw new Error("Invalid report format received from API")
    }


    currentReport = reportData
    renderReport(reportData)
    reportContainer.classList.remove("hidden")

    // Show email section if emails are available
    if (reportData.emails && reportData.emails.length > 0) {
      renderEmailSection(reportData.emails)
      emailContainer.classList.remove("hidden")
    }
  } catch (err) {
    alert("Failed to generate report: " + err.message)
    console.error("Report generation error:", err)
  } finally {
    reportLoading.classList.add("hidden")
    generateReportBtn.disabled = false
  }
})

// Render AIRSA Report
function renderReport(report) {
  const getScoreBadge = (score) => {
    if (score >= 70) return '<span class="score-badge score-excellent">Excellent</span>'
    if (score >= 50) return '<span class="score-badge score-good">Good</span>'
    return '<span class="score-badge score-poor">Needs Improvement</span>'
  }

  const renderList = (items, className = "") => {
    return items.map((item) => `<li class="${className}">${item}</li>`).join("")
  }

  let html = `
        <div class="report-header">
            <h2>${report.company_name}</h2>
            <div class="overall-score">${report.Overall_Score}/100</div>
            ${getScoreBadge(report.Overall_Score)}
        </div>

        <div class="highlights-improvements">
            <div class="highlights">
                <h4><i class="fas fa-check-circle"></i> Top Highlights</h4>
                <ul>${renderList(report.Top3.Top_Highlights)}</ul>
            </div>
            <div class="improvements">
                <h4><i class="fas fa-exclamation-triangle"></i> Top Improvements</h4>
                <ul>${renderList(report.Top3.Top_Improvements)}</ul>
            </div>
        </div>
    `

  // Add Financial Health section
  if (report.Financial_Health) {
    html += `
            <div class="report-section">
                <h3><i class="fas fa-chart-line"></i> Financial Health (Score: ${report.Financial_Health.score}/100)</h3>
                <div class="highlights-improvements">
                    <div class="highlights">
                        <h4>Highlights</h4>
                        <ul>${renderList(report.Financial_Health.highlights)}</ul>
                    </div>
                    <div class="improvements">
                        <h4>Areas for Improvement</h4>
                        <ul>${renderList(report.Financial_Health.improvements)}</ul>
                    </div>
                </div>
            </div>
        `
  }

  // Add other sections dynamically
  const sectionsToShow = [
    "Product Portfolio",
    "Distribution & Supply Chain",
    "Market Research & Development",
    "Sales Performance",
    "Branding & Customer Loyalty",
    "Technology & Innovation",
    "People & Team Management",
    "Challenges & Risks",
    "Competition",
    "Data & Analytics",
    "Business Vision & Strategic Planning",
  ]

  sectionsToShow.forEach((sectionKey) => {
    if (report[sectionKey]) {
      const section = report[sectionKey]
      html += `
                <div class="report-section">
                    <h3>${sectionKey} (Score: ${section.score}/100)</h3>
                    <div class="highlights-improvements">
                        <div class="highlights">
                            <h4>Highlights</h4>
                            <ul>${renderList(section.highlights)}</ul>
                        </div>
                        <div class="improvements">
                            <h4>Areas for Improvement</h4>
                            <ul>${renderList(section.improvements)}</ul>
                        </div>
                    </div>
                </div>
            `
    }
  })

  // Add Way Forward section if available
  if (report.WayForward && report.WayForward.PhasedActionPlan) {
    html += `
            <div class="report-section">
                <h3><i class="fas fa-road"></i> Way Forward - Phased Action Plan</h3>
        `

    report.WayForward.PhasedActionPlan.Phase.forEach((phase) => {
      html += `
                <div style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">${phase.Name} (${phase.Timeline})</h4>
                    <ul style="list-style: none; padding: 0;">
            `

      phase.Actions.forEach((action) => {
        html += `
                    <li style="margin-bottom: 0.75rem; padding: 0.5rem; background-color: #f8fafc; border-radius: 4px;">
                        <strong>Priority ${action.Priority}: ${action.Title}</strong><br>
                        <span style="color: #6b7280; font-size: 0.9rem;">${action.Details}</span>
                    </li>
                `
      })

      html += `</ul></div>`
    })

    html += `</div>`
  }

  reportContent.innerHTML = html
}

// Render email section
function renderEmailSection(emails) {
  selectedEmails.clear()
  emails.forEach((email) => selectedEmails.add(email))

  let emailHtml = `
    <div class="email-add-section">
      <div class="email-input-group">
        <input type="email" id="newEmail" placeholder="Enter new email address" class="email-input">
        <button id="addEmailBtn" class="btn primary btn-small">Add Email</button>
      </div>
      <div id="emailAddResult" class="email-add-result hidden"></div>
    </div>
  `

  emailHtml += '<div class="email-items-container">'
  emails.forEach((email) => {
    emailHtml += `
      <div class="email-item">
        <input type="checkbox" id="email-${email}" data-email="${email}" checked>
        <label for="email-${email}">${email}</label>
      </div>
    `
  })
  emailHtml += "</div>"

  // Add PDF link and attachment option if available
  if (pdfLink) {
    emailHtml += `
      <div class="pdf-attachment-section">
        <h4>PDF Report</h4>
        <div class="pdf-link-container">
          <a href="${pdfLink}" target="_blank" class="pdf-link">
            <i class="fas fa-file-pdf"></i> View PDF Report
          </a>
          <div class="attachment-option">
            <input type="checkbox" id="attachPdf" checked>
            <label for="attachPdf">Attach PDF to email</label>
          </div>
        </div>
      </div>
    `
  }

  emailList.innerHTML = emailHtml

  // Add event listeners for email checkboxes
  emailList.querySelectorAll('input[type="checkbox"][data-email]').forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const email = e.target.dataset.email
      if (e.target.checked) {
        selectedEmails.add(email)
      } else {
        selectedEmails.delete(email)
      }
      updateSendButton()
    })
  })

  // Add event listener for the add email button
  const addEmailBtn = document.getElementById("addEmailBtn")
  if (addEmailBtn) {
    addEmailBtn.addEventListener("click", addNewEmail)
  }

  updateSendButton()
}

function addNewEmail() {
  const newEmailInput = document.getElementById("newEmail")
  const emailAddResult = document.getElementById("emailAddResult")
  const email = newEmailInput.value.trim()

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email) {
    showEmailAddResult("Please enter an email address", "error")
    return
  }

  if (!emailRegex.test(email)) {
    showEmailAddResult("Please enter a valid email address", "error")
    return
  }

  if (selectedEmails.has(email)) {
    showEmailAddResult("This email is already in the list", "error")
    return
  }

  // Add the new email
  selectedEmails.add(email)

  // Clear the input
  newEmailInput.value = ""

  // Show success message
  showEmailAddResult("Email added successfully", "success")

  // Refresh the email list
  const emailItemsContainer = document.querySelector(".email-items-container")
  if (emailItemsContainer) {
    const newEmailItem = document.createElement("div")
    newEmailItem.className = "email-item"
    newEmailItem.innerHTML = `
      <input type="checkbox" id="email-${email}" data-email="${email}" checked>
      <label for="email-${email}">${email}</label>
    `

    // Add event listener to the new checkbox
    const checkbox = newEmailItem.querySelector('input[type="checkbox"]')
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedEmails.add(email)
      } else {
        selectedEmails.delete(email)
      }
      updateSendButton()
    })

    emailItemsContainer.appendChild(newEmailItem)
  }

  updateSendButton()
}

function showEmailAddResult(message, type) {
  const emailAddResult = document.getElementById("emailAddResult")
  emailAddResult.textContent = message
  emailAddResult.className = `email-add-result ${type}-message`
  emailAddResult.classList.remove("hidden")

  // Hide the message after 3 seconds
  setTimeout(() => {
    emailAddResult.classList.add("hidden")
  }, 3000)
}

// Update send button text
function updateSendButton() {
  const count = selectedEmails.size
  sendEmailBtn.querySelector("span").textContent = `Send Email to ${count} recipient${count !== 1 ? "s" : ""}`
  sendEmailBtn.disabled = count === 0
}

// Send emails
sendEmailBtn.addEventListener("click", async () => {
  if (selectedEmails.size === 0) return

  try {
    emailLoading.classList.remove("hidden")
    sendEmailBtn.disabled = true
    emailResult.classList.add("hidden")

    const attachPdfCheckbox = document.getElementById("attachPdf")
    const shouldAttachPdf = attachPdfCheckbox && attachPdfCheckbox.checked && pdfLink

    const payload = JSON.stringify({
      emails: Array.from(selectedEmails),
      message: emailPrompt.value,
      companyName: currentReport?.company_name || "Company",
      attachPdf: shouldAttachPdf,
      pdfLink: shouldAttachPdf ? pdfLink : null,
    })

    const reqBody = {
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        "ChatInput-zzkkC": { input_value: payload },
      },
    }

    const response = await fetch(SEND_EMAIL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    })

    if (response.status === 200) {
      emailResult.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i> 
                    Emails sent successfully to ${selectedEmails.size} recipients!
                </div>
            `
    } else {
      throw new Error(`HTTP ${response.status}`)
    }

    emailResult.classList.remove("hidden")
  } catch (err) {
    emailResult.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> 
                Failed to send emails: ${err.message}
            </div>
        `
    emailResult.classList.remove("hidden")
  } finally {
    emailLoading.classList.add("hidden")
    sendEmailBtn.disabled = false
  }
})
