# -*- coding: utf-8 -*-
from odoo import api, models,fields
from odoo.exceptions import UserError,ValidationError
import requests

class CrmForsah(models.Model):
    _name = "crm.forsah.client"
    _description = "crm_forsah_client"
    name = fields.Char("Name", required=True,readonly=True)
    category = fields.Char("Category",readonly=True)
    link = fields.Char("Link",readonly=True)
    size = fields.Char("Size",readonly=True)
    days = fields.Char("Days",readonly=True)
    city = fields.Char("City",readonly=True)
    tag_ids = fields.Many2many('crm.forsah.tag.client', 'crm_forsah_client_id','Tags')
    forsah_id = fields.Char("ٌRef ID",readonly=True)
    active = fields.Boolean("Active",default=True)

    def get_forsah_data(self):
        url = 'https://service.era.net.sa/forsah/data'
        try:
            response = requests.get(url)
            response.raise_for_status()  
            data_list = response.json()
            self._delete_all_records()  
            if data_list['code'] == '200':
                for data in data_list['data']:
                    self.process_categories_to_tags()  
                    vals = {
                        'forsah_id': data["id"],
                        'name': data["name"],
                        'link': data["link"],
                        'size': data["size"],
                        'category': data["category"],
                        'days': data["days"],
                        'city': data["city"],
                    }
                    self.create(vals)
            else:
                raise UserError(f"Unexpected response code: {data_list['code']}")

        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")
        except ValueError:
            print("An error occurred while decoding JSON response")
        
        
    @api.model
    def process_categories_to_tags(self):
        for record in self.search([]):
            if record.category:
                categories = record.category.split(',')
                ids = []
                for category in categories:
                    category = category.strip()
                    if category:
                        tag = self.env['crm.forsah.tag.client'].sudo().search([('name', '=', category)], limit=1)
                        if not tag:
                            tag = self.env['crm.forsah.tag.client'].sudo().create({'name': category})
                        ids.append(tag.id)
                        record.tag_ids = [(6, 0, ids)]

    @api.constrains('name')
    def _check_name(self):
        for record in self:
            if not record.name:
                raise ValidationError("The Name field cannot be empty.")
    @api.model
    def _delete_all_records(self):
        records = self.search([])
        records.unlink()
       
    def forsah_open_link(self):
            for record in self:
                dynamic_url = f"{record.link}"  
                return {
                        'type': 'ir.actions.act_url',
                        'url': dynamic_url,
                        'target': 'new',}

    def _get_source(self):
            source =self.env['utm.source'].search([('name','=','Forsah')])
            if len(source)==0:
                return False   
            else:
                return source.id  
                             
    def action_create_lead(self):
        crm_lead_model = self.env['crm.lead']
        for record in self:
            leads = crm_lead_model.search(['&',('name','=',record.name),('description','ilike',record.category)])
            if leads:
                 raise ValidationError("This Lead It Already Created.")  
            else:
                if self._get_source()==False:
                    source_id = self.env['utm.source'].create({'name': "Forsah"})
                    lead_data = {
                        'name': record.name,
                        'description': record.category + "  | Days "+str(record.days) + " |  Size " + record.size,
                        'type': 'opportunity',
                        'team_id': 1,
                        'city': record.city,
                        'website': record.link,
                        'source_id': source_id.id,
                    }
                    lead = crm_lead_model.create(lead_data)
                    activity_data =self.env['mail.activity'].create({
                                            'display_name': lead.name,
                                            'summary': '3 Days!',
                                            'user_id': 2,
                                            'res_id': lead.id,
                                            'res_model_id': self.env['ir.model'].search([('model', '=', 'crm.lead')]).id,
                                        'activity_type_id': 4})
                else:  
                    lead_data = {
                        'name': record.name,
                        'description': record.category + "  | Days "+str(record.days) + " |  Size " + record.size,
                        'type': 'opportunity',
                        'team_id': 1,
                        'city': record.city,
                        'website': record.link,
                        'source_id': self._get_source(),
                    }
                    lead = crm_lead_model.create(lead_data)
                    activity_data =self.env['mail.activity'].create({
                                            'display_name': lead.name,
                                            'summary': '3 Days!',
                                            'user_id': 2,
                                            'res_id': lead.id,
                                            'res_model_id': self.env['ir.model'].search([('model', '=', 'crm.lead')]).id,
                                        'activity_type_id': 4})
        return activity_data

