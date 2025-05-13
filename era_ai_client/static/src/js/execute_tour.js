/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
// import { contains } from "@web/../tests/utils";
import { tourService } from "@web_tour/tour_service/tour_service";
import { stepUtils } from "@web_tour/tour_service/tour_utils";
import { tourState } from "@web_tour/tour_service/tour_state";
import { browser } from "@web/core/browser/browser";
import { markup } from "@odoo/owl";
import { session } from "@web/session";
import { redirect } from "@web/core/utils/urls";

registry.category("actions").add("execute_custom_tour", async (env, params) => {
    const tour_script = params.params.tour_script;
    const tour_connector = params.params.tour_connector;

    if (!tour_script) {
        console.warn("tour_script is undefined! Check if it is passed correctly.");
        env.services.notification.add(_t("Tour Script is undefined! Check if it is passed correctly."), { type: 'warning' });
        return;
    }

    try {
        let tourName = params.params.tour_name;
        const tourmode = params.params.tour_mode;
        let step_delay = params.params.step_delay || 1500;
        let pointer_duration = params.params.pointer_duration || 1000;
        const parsedTour = eval(`(${tour_script})`);
        let display_name = tourName;
        console.log("session.uid:", session.uid);

        // Monitor console log for "test successful"
        function monitorTestSuccess() {
            const originalConsoleLog = console.log;

            console.log = async function (message, ...args) {
                originalConsoleLog.apply(console, [message, ...args]);
                console.info("Monitoring start");
                if (typeof message === "string" && message.includes("test successful")) {
                    console.info("Tour completed successfully:", message);

                    if (tour_connector) {
                        await env.services.orm.call("tour.connector", "write", [tour_connector, { state: "success" }]);
                        console.info("Tour connector state updated to 'success':", tour_connector);
                    }

                    env.services.notification.add(_t("Guide completed successfully."), { type: "success" });
                    setTimeout(() => {
                        redirect(location.origin);
                    }, 6000);
                }else {
                    originalConsoleLog.apply(console, [message, ...args]);
                    console.info(" Monetoring faild");
                    
                }
            };
        }

        // Ensure unique tour names
        if (registry.category("web_tour.tours").contains(tourName)) {
            console.log(`Tour '${tourName}' already exists. Creating a backup.`);
            tourName = `${tourName}_backup_${Date.now()}`;
        }

        // Register and execute the tour
        registry.category("web_tour.tours").add(tourName, parsedTour);

        if (tourmode === "auto") {
            await env.services.tour_service.startTour(tourName, {
                mode: "auto",
                stepDelay: step_delay,
                showPointerDuration: pointer_duration
            });
            console.log("Tour executed in Auto mode.");
            
        } else {
            await env.services.tour_service.startTour(tourName, { mode: "manual" });
            console.log("Tour executed in Manual mode.");

        }

        // Check if the tour was consumed
        let listTour = await env.services.orm.call("web_tour.tour", "get_consumed_tours", []);
        if (listTour.includes(tourName)) {
            console.log(`The tour "${tourName}" has been completed.`);
            if(tourmode === "auto"){
                env.services.notification.add(_t(`${display_name} \n Auto Guide Successfully`), { type: "success" });
            }
            if(tourmode === "manual"){
                env.services.notification.add(_t(`${display_name} \n Manual Guide Successfully`), { type: "success" });
            }
            monitorTestSuccess(); // Start monitoring console logs for the success message
        } else {
            console.log(`The tour "${tourName}" has not been completed yet.`);
            
            // Forcefully mark the tour as consumed
            await env.services.orm.call("web_tour.tour", "consume", [[tourName]]);

            
            if (tourmode === "auto") {
                await env.services.tour_service.startTour(tourName, {
                    mode: "auto",
                    stepDelay: step_delay,
                    showPointerDuration: pointer_duration
                });
                console.log("Tour executed in Auto mode.");
                
            } else {
                await env.services.tour_service.startTour(tourName, { mode: "manual" });
                console.log("Tour executed in Manual mode.");
    
            }
            
            monitorTestSuccess(); // Start monitoring console logs for the success message
        }

    } catch (error) {
        console.error("Failed to execute the tour:", error);
        env.services.notification.add(_t("Failed to execute the tour.\n Please reload the page and try again."), { type: "warning" });
        try{
            const response = await env.services.orm.call('tour.connector',
                    'chat_with_gpt', // 'get_chatgpt_response',
                    [tour_connector],
                    {});

            const tourRun = env.services.action.doActionButton({
                            type: "object",
                            resId: tour_connector,
                            name: "execute_tour",
                            resModel: "tour.connector",
                        });
        } catch (nestedError) {
                    console.error("Error during fallback recovery:", nestedError);
        }
    }
});
