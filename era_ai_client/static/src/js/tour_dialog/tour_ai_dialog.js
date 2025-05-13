/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { jsonRpc } from "@web/core/network/rpc_service";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { markup } from "@odoo/owl";

/**
 * General component for common logic between different dialogs.
 */
export class TourAIDialog extends Component {
    static components = { Dialog };
    static props = {
        close: { type: Function },
        onClose: { type: Function },
        title: { type: String, optional: true },
    };

    static template = "era_ai_client.tour_ai_dialog_template";
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
            createdRecordID: "", // tour connector new record
            executeMode: "", //
        });

        // Bind dragging methods
        this.startDragging = this.startDragging.bind(this);
        this.drag = this.drag.bind(this);
        this.stopDragging = this.stopDragging.bind(this);

        this.samples = useState({ list: [] });
        // Fetch data from the Python controller before the component is rendered
        onWillStart(async () => {
            const samples = await this.rpc("/get_tour_samples", {});
            this.samples = { list: samples }; // Correct state mutation

            // Initialize Select2
            setTimeout(() => {
                    if ($.fn.select2) {
                        $("#sample-selector").select2({
                            allowClear: true
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

    // Function to detect changes in the StepsInput textarea
    _onstepsInputChange(ev) {

        const textarea = document.getElementById('stepsInput');   //ev.target;
        const radioButtonsDiv = document.getElementById('radioButtonsDiv');

        // Show radio buttons if textarea has content
        if (textarea.value.trim() !== '') {
            radioButtonsDiv.style.display = 'block';
        } else {
            radioButtonsDiv.style.display = 'none';
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
        const dialog = document.querySelector(".tour-ai-modal");
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
    closeTourAIModel() {

        this.props.close();
        // Re-enable both menu items when the dialog is closed
        document.getElementById("TourAIModel").classList.remove("disabled");
        // document.getElementById("SQLAIModel").classList.remove("disabled");

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
            this._sendTourAIRequest(); // Call the function to handle the request
        }
    }

    // Called to trigger the event listener on the user input text area
    mounted() {
        const userInputElement = document.getElementById("userInput");
        if (userInputElement) {
            userInputElement.addEventListener("keydown", (event) => this._onKeyDown(event));
        }
    }

    // Reload the selection from controller
    async loadSamples() {
        if (!this.samples.list.length) { // Load only if empty
            this.samples.list = await this.rpc("/get_tour_samples", {});
        }
    }

    // Function to set sample text and execute the tour
    async setSampleTextAndExecute(ev) {
        const sampleText = ev.target.value; // Get sample text from selected option
        const textarea = document.getElementById("userInput"); // Reference to textarea
        textarea.value = sampleText; // Set the textarea value

        await this._sendTourAIRequest(); // Call the function to send the request
        
        document.getElementById("sample-selector").disabled = false;
    }
    
    //Re-execute when execute failed
    async failedExecute() {
        
        await this._sendTourAIRequest(); // Call the function to send the request
        await this._executeTourAIRequest(); // Call the function to re-execute
    }

    /**
     * Function to handle Send button click
     */
    async _sendTourAIRequest() {
        console.log("Sending Tour AI Request...", this.state.createdRecordID);
        // on function processing tell the user
          
        $(event.currentTarget).prop("disabled", true);
        $('#stepsInput').val('');
        $('#stepsInput')[0].placeholder = _t("Processing.....");
        // Get the user input
        const userInput = document.getElementById("userInput").value;

        $('#userInput').prop("disabled", true);    
        await this._getChatGPTResponse(userInput)
        $('#userInput').prop("disabled", false);    
    }

    async _getChatGPTResponse(userInput) {
        const orm = this.orm;
        // Check if `createdRecordID` is already set
        if (!this.state.createdRecordID) {
            console.log("Creating new record as createdRecordID is not set");

            try {
                // Step 1: Create a record in the 'tour.connector' model
                const record = await orm.call('tour.connector', 'create', [
                    {
                        name: userInput, // Set the name field with the user input
                    },
                ]);
                this.state.createdRecordID = record; // Store the ID of the created record
            } catch (error) {
                console.error("Error in creating record:", error);
                this.notification.add(error.message || _t("Please, try again!"), {
                type: "warning",
            });
            }
        } else {
            console.log("Write record with createdRecordID :",this.state.createdRecordID);

            try {
                // Step 1: Write a record in the 'tour.connector' model
                const recwrite = await orm.write('tour.connector', [this.state.createdRecordID],
                    {
                        'name': userInput, // Set the name field with the user input
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
            // Step 2: Call the 'get_chatgpt_response' function in the 'tour.connector' model
            const response = await orm.call(
                'tour.connector',
                'chat_with_gpt', // 'get_chatgpt_response',
                [this.state.createdRecordID],
                {}
            );

            // Step 3: Check if response contains 'steps' and 'script'
            const { steps, script } = response;
            if (!steps || !script) {
                let msg =   response + _t('\nExecution stopped ...');
                if (!script){
                    msg = _t("It seems like your prompt is unclear. or "+response+" \nExecution stopped ...");
                }
                $('#stepsInput')[0].placeholder = msg ;
                return; // Stop further execution if data is invalid
            }
            // Step 4: Update the steps and script text areas with the response
            // Create a temporary div element
            const tempDiv = document.createElement("div");

            // Set the innerHTML of the temp div to the HTML string (steps)
            tempDiv.innerHTML = steps;

            // Get the plain text content after rendering the HTML
            const plainText = tempDiv.textContent || tempDiv.innerText;

            document.getElementById("stepsInput").value = plainText || '';
            document.getElementById("scriptInput").value = script || '';
            await orm.write('tour.connector', [this.state.createdRecordID],
                    {
                        'tour_steps': plainText, // Set the steps field with the plainText input
                    },
                    );
            this._onstepsInputChange(document.getElementById("stepsInput"))
        } catch (error) {
            console.error("Error in getting response:", error);
            this.notification.add(error.message || _t("Please, try again!"), {
                type: "warning",
            });
        }
    }

    // Dedect auto tour execute
    async autoExecute (){
        this.state.executeMode = 'auto'; // Set to auto if auto is clicked
        await this._executeTourAIRequest()
        
    }

    // Dedect manual tour execute
    async manualExecute (){
        this.state.executeMode = 'manual'; // Set to manual if manualis clicked
        await this._executeTourAIRequest()
        
    }

    // Execute Request
    async _executeTourAIRequest() {
        const orm = this.orm;

        try {
            // Get the selected execution mode from radio buttons
            let executeMode = this.state.executeMode;

            console.log("execute record with tour_mode:", executeMode);

            // Ensure `createdRecordID` is valid
            if (!this.state.createdRecordID) {
                throw new Error("No record found to executed. Please create a record first.");
            }

            // Step 1: Write the tour_mode to the record
            if (executeMode) {
                const result = await orm.write('tour.connector', [this.state.createdRecordID], {
                    tour_mode: executeMode, // Update the `tour_mode` field
                });
            }

            console.log("Record updated successfully with tour_mode:", executeMode);
            // Step 2: Call the 'execute_tour' function in the 'tour.connector' model
            try {
                    // Re-enable both menu items when the dialog is closed
                    // const tourRun = await this.action.doAction(response);
                    const tourRun = this.action.doActionButton({
                        type: "object",
                        resId: this.state.createdRecordID,
                        name: "execute_tour",
                        resModel: "tour.connector",
                    });

                    this.notification.add(
                        _t("The Guide Start Successfully .."), // [error.message || error]
                        { type: 'success' }
                    );
                } catch (error) {
                    console.error("The tour execution failed:", error);
                    // Handle the error (e.g., show a notification)
                    this.notification.add(
                        _t("Will try again, Please don't Leave.."), // [error.message || error]
                        { type: 'warning' }
                    );
                    await this.failedExecute();
                }
            
            this.closeTourAIModel();
            document.getElementById("TourAIModel").classList.remove("disabled");
            // document.getElementById("SQLAIModel").classList.remove("disabled");

            console.log("Tour executed successfully:");
        } catch (error) {
            console.error("Error in executing tour:", error);
            
            this.notification.add(
                        _t("Failed executing tour, Try again later.."),//, [error.message || error]
                        { type: 'warning' }
                    );
            $('#stepsInput')[0].placeholder = _t('Failed Executing . \nExecution stopped ...\n'+error.message);
            return;
        }
    }


}
