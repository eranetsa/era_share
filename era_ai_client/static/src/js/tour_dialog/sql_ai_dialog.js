/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { jsonRpc } from "@web/core/network/rpc_service";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";

/**
 * General component for common logic between different dialogs.
 */
export class SQLAIDialog extends Component {
    static components = { Dialog };
    static props = {
        close: { type: Function },
        onClose: { type: Function },
        title: { type: String, optional: true },
    // Add other props here if supported
    };

    static template = "era_ai_client.sql_ai_dialog_template";
    // Setup component state
    // Setup component state
    setup() {
        super.setup(...arguments);
        this.notification = useService("notification");
        this.action = useService("action");

        this.orm = useService("orm");
        this.rpc = useService("rpc");
        // State to manage modal visibility
        this.state = useState({
            userInput: "", // Tracks the value of the user input
            createdRecordID: "", // sql connector new record
            reportNameInput: "" // report name
            // executeMode: "", //
        });

        // Bind dragging methods
        this.startDragging = this.startDragging.bind(this);
        this.drag = this.drag.bind(this);
        this.stopDragging = this.stopDragging.bind(this);

        this.samples = useState({ list: [] });
        // Fetch data from the Python controller before the component is rendered
        onWillStart(async () => {
            const samples = await this.rpc("/get_sql_samples", {});
            this.samples = { list: samples }; // Correct state mutation

            // Initialize Select2
                setTimeout(() => {
                    if ($.fn.select2) {
                        $("#sample-selector").select2({
                            allowClear: true,
                           
                        }).on('change', (ev) => {  // Correct event binding for Select2
                            this.setSampleTextAndExecute(ev);
                        });
                    } else {
                        console.error("Select2 library is not loaded!");
                    }
                }, 50);  // Small delay to ensure DOM is ready
        });

    }

    /**
     * Function to handle user input changes in the textarea
     * @param {Event} ev - The event object
     */
    _onInputChange(ev) {
        this.state.userInput = ev.target.value;
    }

    // Function to detect changes in the executionMessage textarea
    _onExecutionMessageChange(ev) {

        const textarea = document.getElementById('executionMessage');   //ev.target;
        const downloadReportDiv = document.getElementById('downloadReportDiv');

        // Show Download Report file if textarea has content
        if (textarea.value.trim() !== '') {
            downloadReportDiv.style.display = 'block';
        } else {
            downloadReportDiv.style.display = 'none';
        }
    }

     // When the Enter key is pressed in the user input, trigger the button click
     _onKeyDown(event) {
        console.log("Key pressed===:", event.key); // Check the key pressed
        if (event.key === 'Enter' && event.shiftKey) {
            // If Shift + Enter is pressed, allow a new line
            // Do nothing (this will allow the default action to occur, which is adding a new line)
            return;
        }
        if (event.key === 'Enter') {
            this.state.userInput = event.target.value;
            event.preventDefault(); // Prevent the default Enter key behavior (e.g., adding a new line in the textarea)
            this._sendSqlAIRequest(); // Call the function to handle the request
        }
    }

    // Called to trigger the event listener on the user input text area
    mounted() {
        const userInputElement = document.getElementById("userInput");
        if (userInputElement) {
            userInputElement.addEventListener("keydown", (event) => this._onKeyDown(event));
        }
    }


    startDragging(event) {
        this.dragging = true;
        this.offsetX = event.clientX - event.target.parentElement.offsetLeft;
        this.offsetY = event.clientY - event.target.parentElement.offsetTop;
        document.addEventListener("mousemove", this.drag);
        document.addEventListener("mouseup", this.stopDragging);
    }

    drag(event) {
        if (!this.dragging) return;
        const dialog = document.querySelector(".sql-ai-modal");
        dialog.style.left = `${event.clientX - this.offsetX}px`;
        dialog.style.top = `${event.clientY - this.offsetY}px`;
    }

    stopDragging() {
        this.dragging = false;
        document.removeEventListener("mousemove", this.drag);
        document.removeEventListener("mouseup", this.stopDragging);
    }

    /**
     * Function to close the dialog
     */
    closeSqlAIModel() {
        
        this.props.close();
        // Re-enable both menu items when the dialog is closed
        document.getElementById("TourAIModel").classList.remove("disabled");
        document.getElementById("SQLAIModel").classList.remove("disabled");

    }

    // Reload the selection from controller
    async loadSamples() {
        if (!this.samples.list.length) { // Load only if empty
            this.samples.list = await this.rpc("/get_sql_samples", {});
        }
    }

    // Function to set sample text and execute the tour
    async setSampleTextAndExecute(ev) {
        const sampleText = ev.target.value; // Get sample text from selected option
        const textarea = document.getElementById("userInput"); // Reference to textarea
        textarea.value = sampleText; // Set the textarea value

        await this._sendSqlAIRequest(); // Call the function to send the request

        document.getElementById("sample-selector").disabled = false;
    }

    async failedExecute() {
        
        await this._sendSqlAIRequest(); // Call the function to send the request
        await this._executeSQLAIRequest(); // Call the function to re-execute
    }


    // /**
    //  * Function to handle Send button click
    //  */
    async _sendSqlAIRequest() {
        console.log("Sending SQL AI Request...", this.state.createdRecordID);
        // on function processing tell the user
        $(event.currentTarget).prop("disabled", true);
        $('#executionMessage').val('');
        $('#executionMessage')[0].placeholder = _t("Processing.....");

        // call function to get response
        // Get the user input
        const userInput = document.getElementById("userInput").value;
        this.state.reportNameInput = document.getElementById("reportNameInput").value;
        
        $('#userInput').prop("disabled", true);  
        await this._getChatGPTResponse(userInput);
        console.log("Generate SQL Query Successfully Requested...")
        await this._executeSQLAIRequest();
        console.log("Execute SQL Query Successfully Requested...")
        $('#userInput').prop("disabled", false);  
    }

    async _getChatGPTResponse(userInput) {
        const orm = this.orm;

        // Check if `createdRecordID` is already set
        if (!this.state.createdRecordID) {
            console.log("Creating new record as createdRecordID is not set");
            try {
                // Step 1: Create a record in the 'sql.connector' model
                const record = await orm.call('sql.connector', 'create', [
                    {
                        name: this.state.reportNameInput,
                        sql_description: userInput, // Set the name field with the user input

                    },
                ]);

                this.state.createdRecordID = record; // Store the ID of the created record
            } catch (error) {
                console.error("Error in creating record:", error);
                this.notification.add(error.message || _t("Please, try again!"), {
                type: "warning",
            });
                // return false; // Exit the function if record creation fails
            }
        } else {
            console.log("Write record with createdRecordID :",this.state.createdRecordID);

            try {
                // Step 1: Write a record in the 'sql.connector' model
                const recwrite = await orm.write('sql.connector', [this.state.createdRecordID],
                    {
                        'name': this.state.reportNameInput, // Set the name field with the user input
                        'sql_description': userInput,
                    },
                );

                // this.state.createdRecordID = record; // Store the ID of the created record
            } catch (error) {
                console.error("Error in Write record:", error);
                this.notification.add(error.message || _t("Please, try again!"), {
                type: "warning",
            });
                // return false; // Exit the function if record creation fails
            }

        }

        // Use the existing or newly created `createdRecordID`
        console.log("Using createdRecordID:", this.state.createdRecordID);

        try {
            // Step 2: Call the 'get_chatgpt_response' function in the 'sql.connector' model
            const response = await orm.call(
                'sql.connector',
                'chat_with_gpt', // 'get_chatgpt_response',
                [this.state.createdRecordID],
                {}
            );

            // Step 3: Check if response contains 'steps' and 'script'
            const { sql_query } = response;

            if (sql_query.trim() === "") {
                
                msg = _t("It seems like your prompt is unclear. Could you please provide clear and more details? \nExecution stopped ...")
                
                $('#executionMessage')[0].placeholder = msg;
                return false; // Stop further execution if data is invalid
            }
            // Step 4: Update the query text areas with the response
            document.getElementById("queryInput").value = sql_query || '';

        } catch (error) {
            console.error("Error in getting response:", error);
            this.notification.add(error.message || _t("Please, try again!"), {
                type: "warning",
            });
        }
    }

    
    async _executeSQLAIRequest() {
        const orm = this.orm;

        try {
            // Get the selected execution mode from radio buttons
            let executeQuery = document.getElementById("queryInput").value;
            // Convert to lowercase and check if it starts with "select"
            if (executeQuery.trim()!== '' && !executeQuery.trim().toLowerCase().startsWith("select")) {
                this.notification.add(
                        _t("Sorry, This AI is for Reporting only..."),
                        { type: 'warning' }
                    );
                $('#executionMessage')[0].placeholder = _t("Sorry, This AI is for Reporting only...");

                return;
            }
            // Ensure `createdRecordID` is valid
            if (!this.state.createdRecordID) {
                throw new Error("No record found to executed. Please create a record first.");
            }

            // Step 1: Write the tour_mode to the record
            if (executeQuery) {
                const result = await orm.write('sql.connector', [this.state.createdRecordID], {
                    sql_query: executeQuery, // Update the `tour_mode` field
                });
            }else{
                this.notification.add(
                        _t("No Query found to executed..."),
                        { type: 'warning' }
                    );
            }

            // Step 2: Call the 'execute_query' function in the 'sql.connector' model
            try {
    const response = await orm.call(
        'sql.connector',
        'execute_query',
        [this.state.createdRecordID],
        {}
    );

    const context = response.context;

    if (context) {

        // Clear previous messages
        document.getElementById('executionMessage').value = context.execution_message || '';
        this._onExecutionMessageChange(document.getElementById("executionMessage"));

        let reportName = context.report_name || _t('AI Report');

        if (context.response_report_file) {
            // Create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${context.response_report_file}`;
            downloadLink.download = reportName || 'report.xlsx';
            downloadLink.innerHTML = '<i class="fas fa-download"></i> ' + reportName;
            downloadLink.style.textDecoration = 'none';
            downloadLink.style.color = '#00008B'; // Dark Blue

            // Append download link to report container
            const downloadLinkContainer = document.getElementById('download_link_container');
            downloadLinkContainer.innerHTML = ''; // Clear previous content
            downloadLinkContainer.appendChild(downloadLink);

            // Append Report table  container
            const reportLinkContainer = document.getElementById('report_link_container');
            reportLinkContainer.innerHTML = ''; // Clear previous content
            // reportLinkContainer.appendChild(downloadLink);

            // 🔹 Convert Base64 to Blob for XLSX parsing
            const byteCharacters = atob(context.response_report_file);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            // 🔹 Read Excel file using SheetJS
            // load mondial relay script
            let script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
            script.async = true;
            document.head.appendChild(script);
            await new Promise((resolve) => script.onload = resolve);
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });

                // Get first sheet name
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert sheet to JSON array
                const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // 🔹 Generate Table
                const table = document.createElement("table");
                table.style.width = "100%";
                table.style.borderCollapse = "collapse";
                table.border = "1";


                sheetData.forEach((row, rowIndex) => {
                    const tr = document.createElement("tr");

                    row.forEach((cellData, cellIndex) => {
                    // Determine whether this cell is a header or data cell
                    const isHeader = rowIndex === 0;
                    const cell = document.createElement(isHeader ? "th" : "td");
                    cell.textContent = cellData || "-";

                    // Apply header styles if it's a <th>, otherwise apply data styles
                    if (isHeader) {
                        cell.style.backgroundColor = "#AFE1AF";  // Green background for header
                        // cell.style.color = "white";               // White text for header
                        cell.style.textAlign = "center";          // Center-align text in header
                        cell.style.padding = "2px";              // More padding for header
                        cell.style.fontWeight = "bold";           // Bold font for header
                        cell.style.fontSize = "14px";             // Slightly larger font size for header
                        cell.style.border = "1px solid #ddd";     // Light border for header
                    } else {
                        cell.style.border = "1px solid #ddd";     // Light border for data cells
                        cell.style.padding = "0px";               // Padding for data cells
                        cell.style.textAlign = "center";          // Center-align data cells
                        cell.style.fontSize = "14px";             // Font size for data cells
                    }

                    tr.appendChild(cell);
                });

                    table.appendChild(tr);
                });

                // 🔹 Create Scrollable Div
                const scrollContainer = document.createElement("div");
                scrollContainer.style.maxHeight = "400px"; // Limit height for scrolling
                scrollContainer.style.overflowY = "auto"; // Enable vertical scrolling
                scrollContainer.style.overflowX = "auto"; // Enable horizontal scrolling
                scrollContainer.style.border = "1px solid black"; // Add border
                scrollContainer.style.padding = "10px";

                // 🔹 Append Table to Scrollable Container
                scrollContainer.appendChild(table);

                // 🔹 Append Scrollable Container to Report Link Container
                reportLinkContainer.appendChild(scrollContainer);

            };

            reader.readAsArrayBuffer(blob);

        } else {
            document.getElementById('report_link_container').innerText = ''
            document.getElementById('download_link_container').innerText = _t('No report generated.');
        }
    }

    console.log("The SQL executed successfully.");
    this.notification.add(_t("The Request executed successfully.."), { type: 'success' });
} catch (error) {
    console.error("The SQL execution failed:", error);
    this.notification.add(_t("Failed Generating Report, Try again later.."), { type: 'warning' });
     $('#executionMessage')[0].placeholder = _t('Failed Generating Report \nExecution stopped ...\n'+error.message);
}

            console.log("SQL executed successfully:");
        } catch (error) {
            console.error("Error in executing SQL:", error);
            
        }
    }

    

}
