
from odoo import models, fields, api, _
import requests




class HrEmployee(models.Model):
    _inherit = 'hr.employee'
    iqamaNumber = fields.Char(string="Iqama Number")
    last_visa_number = fields.Char(string="Last Visanumber" )
    borderNumber = fields.Char(string="BorderNumber")
    passportNumber = fields.Char(string="PassportNumber")
    expriry_pass_date = fields.Date(string="PassportExpiry")
    expriry_date_iqama = fields.Date(string="IqamaExpiry")

    def _get_is_admin(self):
        """
        Compute method to check if the user is an admin.
        """
        for rec in self:
            rec.is_admin = False
            # is_debug_mode = self.user_has_groups('base.group_no_one')
            is_debug_mode=self.env.user.has_group('base.group_no_one')

            if self.env.user.id == self.env.ref('base.user_admin').id :
                rec.is_admin = True

    is_admin = fields.Boolean(compute=_get_is_admin, string="Is Admin",
                              help='Check if the user is an admin.')

