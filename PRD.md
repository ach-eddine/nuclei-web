# Product Requirements Document (PRD): Nuclei Dashboard GUI (MVP)

## 1. Project Vision

To transform the **Nuclei** (CLI) vulnerability scanning tool into a containerized desktop application accessible through an intuitive graphical interface. The goal is to centralize execution, storage (Elasticsearch), and visual analysis of results within a single, portable environment.

---

## 2. MVP Objectives

- **Accessibility:** Eliminate CLI complexity for less technical users or those who prefer visual workflows.
- **Centralization:** Package Nuclei, an Elasticsearch instance, and the UI inside a single "all-in-one" Docker container.
- **Performance:** Leverage Elasticsearch to index and filter scan results near-instantaneously.
- **Native Visualization:** Provide built-in severity charts without requiring a Kibana installation.

---

## 3. Technical Architecture

- **Container:** Single Docker Image (Monolithic Architecture).
- **Internal Orchestration:** `Supervisord` or a robust `entrypoint.sh` to manage the 3 services.
- **Database:** Elasticsearch 8.x (configured in "Single Node" mode).
- **Scanner:** Nuclei (Latest stable version).
- **Backend (Bridge):** Node.js (Express) or Python (FastAPI) to trigger the Nuclei binary and query ES.
- **Frontend:** React.js or Vue.js (served via a lightweight web server).

---

## 4. Functional Specifications

### 4.1. Configuration Screen (Launchpad)

- **Targets:**
  - Text field for a single URL/IP.
  - File selector/uproad (to load a `.txt` list mapped via Docker volume).
- **Scan Configuration:**
  - Quick selection by tags (e.g., `cves`, `exposures`, `critical`).
  - Checkboxes for "Silent" or "Verbose" modes.
- **Action Button:** "Start Scan".

### 4.2. Real-Time Monitoring

- **Progress Bar:** Visual indicator of the scan status.
- **Console Log Toggle:** A button to expand an integrated terminal showing the live `stdout` stream from Nuclei.
- **Health Indicator:** Connection status for the internal Elasticsearch instance.

### 4.3. Results Dashboard (Analytics)

- **Visual Summary:**
  - Total vulnerability count.
  - Donut/Pie chart showing flaws by severity: $Critical$, $High$, $Medium$, $Low$, $Info$.
- **Data Table:**
  - Columns: Template ID, Target, Severity, Protocol, Time.
  - Global text search powered by the Elasticsearch API.
  - **Details View:** Modal window displaying the raw HTTP Request and Response (Proof of Concept).

---

## 5. Non-Functional Specifications

- **Persistence:** Use of a Docker Volume for the `/usr/share/elasticsearch/data` directory to save data between restarts.
- **Performance:** The UI must remain responsive even with 10,000+ entries in the ES index.
- **Simplicity:** Zero-configuration required by the end-user beyond the initial `docker run` command.

---

## 6. User Flow Schema

1.  **Startup:** User launches the container.
2.  **Wait State:** UI displays "Waiting for Elasticsearch..." until the service is healthy.
3.  **Setup:** User enters targets and selects desired templates.
4.  **Execution:** Nuclei runs in the background and pushes JSON results to ES.
5.  **Analysis:** User explores charts, filters results, and exports reports.

---

## 7. Development Roadmap (MVP)

- [ ] **Phase 1:** Build the Dockerfile combining ES + Nuclei + Base Backend.
- [ ] **Phase 2:** Develop the bridging script (executing `nuclei -es` command).
- [ ] **Phase 3:** Create the Dashboard UI (React/Vue querying ES).
- [ ] **Phase 4:** Load testing and data volume management.
