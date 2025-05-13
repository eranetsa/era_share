/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { rpc } from "@web/core/network/rpc";
import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { Dropdown } from '@web/core/dropdown/dropdown';
import { DropdownItem } from '@web/core/dropdown/dropdown_item';
import { _t } from "@web/core/l10n/translation";
import { TourAIDialog } from './tour_ai_dialog'; 
import { SQLAIDialog } from './sql_ai_dialog'; 

registry.category("services").add("aiWidgetService", {
    dependencies: ["action"],
    start(env, { action }) {
        let hasHomeMenu = false;
        let isObserverActive = false;  // Prevent multiple observers

        class AISystrayIcon extends Component {
            setup() {
                super.setup(...arguments);
                this.action = useService("action");
                this.rpc = rpc;
                this.state = useState({ showTourAIModel: false });

                onMounted(() => this.onMounted());
                onWillUnmount(() => this.onWillUnmount());
            }

            async onMounted() {
                console.log("Component Mounted");
            }

            onWillUnmount() {
                console.log("Component Unmounted");
            }

            _openTourAIModel() {
                // Disable both menu items
                document.getElementById("TourAIModel").classList.add("disabled");
                // document.getElementById("SQLAIModel").classList.add("disabled");
                this.env.services.dialog.add(TourAIDialog, {
                    title: _t("Guide You, How Can I Help You?"),
                    onClose: () => console.log("Guide AI Dialog closed"),
                });
            }

            _openSQLAIModel() {
                // Disable both menu items
                document.getElementById("TourAIModel").classList.add("disabled");
                // document.getElementById("SQLAIModel").classList.add("disabled");
                // this.env.services.dialog.add(SQLAIDialog, {
                //     title: _t("AI Reports, How Can I Help You?"),
                //     onClose: () => console.log("Reports AI Dialog closed"),
                // });
            }
        }

        AISystrayIcon.template = "era_ai_client.tour_ai_systray_icon";
        AISystrayIcon.components = { Dropdown, DropdownItem };

        export const AIsystrayItem = { Component: AISystrayIcon };

        // MutationObserver (Attach only ONCE)
        const observer = new MutationObserver(() => {
            if (!hasHomeMenu) {
                const element = document.querySelector('.o_home_menu_background');
                if (element) {
                    hasHomeMenu = true;
                    console.log('Element found:', element);
                    // Remove for mobile devices
                    if (isMobile() == "desktop"){
                        registry.category("main_components").add("AISystrayIcon", AIsystrayItem, { sequence: 1 });
                    }
                    observer.disconnect();
                    isObserverActive = false;  // Mark observer as inactive
                    console.log("MutationObserver disconnected after adding component.");
                }
            }
        });

        // Observe only if not already active
        if (!isObserverActive) {
            observer.observe(document.body, { childList: true, subtree: true });
            isObserverActive = true;
        }

        // Handle Menu Toggle Event
        env.bus.addEventListener("HOME-MENU:TOGGLED", () => {
            console.log("HOME-MENU:TOGGLED event triggered");

            // Ensure component is removed if it exists
            if (hasHomeMenu) {
                registry.category("main_components").remove("AISystrayIcon");
                hasHomeMenu = false;
            }
            if (isMobile() == "mobile" || isMobile() == "tablet") {
                registry.category("main_components").remove("AISystrayIcon");
                hasHomeMenu = false;
                console.log("Systray icon removed for mobile devices");
            }
            // Restart observation only if not already active
            if (!isObserverActive) {
                observer.observe(document.body, { childList: true, subtree: true });
                isObserverActive = true;
            }
        });
        
        // Function to check if the device is mobile
        function isMobile() {
            const ua = navigator.userAgent;
          if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
                return "tablet";
          }
          if (
                /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
                  ua
                )
          ) {
                return "mobile";
          }
          return "desktop";
        }
        
        
        return {
            get hasHomeMenu() {
                return hasHomeMenu;
            }
        };
    }
});
