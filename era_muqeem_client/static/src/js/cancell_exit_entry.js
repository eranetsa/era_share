odoo.define('era_integration_muqeem.cancell_exit_entry', ['web.core', 'web.FormController'], function (require) {
    'use strict';

    var FormController = require('web.FormController');

    function confirmPrint(button) {
        var form = button.closest('form');
        var employee_id = form.querySelector('input[name="employee_id"]').value;
        var iqamaNumber = form.querySelector('input[name="iqamaNumber"]').value;
        var confirmMessage = `Employee ID: ${employee_id}, Iqama Number: ${iqamaNumber}. سوف يتم ارسال الطلب الى وزارة الداخلية تحت مسؤوليتكم المباشرة`;

        return confirm(confirmMessage);
    }

    FormController.include({
        _onButtonClicked: function (event) {
            if (event.data.attrs.name === 'cancell_reentry_exit') {
                if (!confirmPrint(event.target)) {
                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }
            }
            this._super(event);
        },
    });
});
