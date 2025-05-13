/** @odoo-module **/

import { registry } from "@web/core/registry";

// Get the service definition (not the instance!)
const originalTourServiceDef = registry.category("services").get("tour_service");


registry.category("services").add(
    "tour_service",
    {
        dependencies: ["orm", "effect", "overlay", "localization"],

        async start(env, { orm, effect, overlay }) {
            const superService = await originalTourServiceDef.start(env, { orm, effect, overlay });
            console.log("✅ Custom resumeTour logic START------1");

            async function monitorTestSuccess(tour_connector) {
                const originalConsoleLog = console.log;

                console.log = async function (message, ...args) {
                    originalConsoleLog.apply(console, [message, ...args]);
                    console.info("Monitoring start");

                    if (typeof message === "string" && message.includes("tour succeeded")) {
                        console.info("Tour completed successfully:", message);

                        if (tour_connector) {
                            await env.services.orm.call("tour.connector", "write", [tour_connector, { state: "success" }]);
                            console.info("Tour connector state updated to 'success':", tour_connector);
                        }

                        env.services.notification.add(_t("Guide completed successfully."), { type: "success" });
                        setTimeout(() => {
                            window.location.href = window.location.origin;
                        }, 6000);
                    } else {
                        console.info("Monitoring failed");
                    }
                };
            }

            return {
                ...superService,
                monitorTestSuccess, // 🔥 Expose it here
            };
        },
    },
    { force: true }
);
