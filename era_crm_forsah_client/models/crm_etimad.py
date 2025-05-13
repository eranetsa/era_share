# -*- coding: utf-8 -*-
from odoo import api, models,fields
from odoo.exceptions import UserError,ValidationError
import requests

class CrmEtimad(models.Model):
    _name = "crm.etimad.client"
    _description = "crm_etimad"
    name = fields.Char("Name", required=True,readonly=True)
    category = fields.Char("Category")
    link = fields.Char("Link",readonly=True)
    company = fields.Char("Company",readonly=True)
    method = fields.Char("method",readonly=True)
    ref = fields.Char("Ref",readonly=True)
    cost = fields.Char("cost",readonly=True)
    questions = fields.Date('Questions',readonly=True)
    limit = fields.Date('Limit',readonly=True)
    publish = fields.Date('Publish',readonly=True)
    tag_ids = fields.Many2many('crm.etimad.tag.client', 'Tags')
    etimad_id = fields.Char("Ref ID",readonly=True)
    active = fields.Boolean("Active",default=True)
    
    def action_archive_old(self):
        today = fields.Date.today()
        record = self.search([('limit','<',today)])
        for line in record:
                line.active = False

    def _get_domain(self):
        domain=[]
        today = fields.Date.today()
        domain=[('limit','>=',today)]
        return domain    
 
    def get_etimad_data(self):
        url = 'https://service.era.net.sa/etimad/data'
        try:
            response = requests.get(url)
            response.raise_for_status()  
            data_list = response.json()
            
            if data_list['code'] == '200':
                for data in data_list['data']:
                    vals = {
                        'etimad_id': data["id"],
                        'name': data["name"],
                        'link': data["link"],
                        'category': data["category"],
                        'limit': data["limit"],
                        'company': data["company"],
                        'method': data["method"],
                        'ref': data["ref"],
                        'cost': data["cost"],
                        'questions': data["questions"],
                        'publish': data["publish"],
                    }
                    domain = [('ref', '=', data["ref"])]
                    existing_record = self.search(domain, limit=1)
                    if not existing_record:
                        self.create(vals)
            else:
                raise UserError(f"Unexpected response code: {data_list['code']}")
        
        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")
        except ValueError:
            print("An error occurred while decoding JSON response")
         
    @api.model
    def process_categories_to_tags(self,num_to_process=2):
        processed_count = 0
        for record in self.search([('tag_ids','=',False)]):
            if record.category:
                categories = record.category.split('-')
                ids = []
                for category in categories:
                    if processed_count >= num_to_process:
                        break
                    else:
                        category = category.strip()
                        if category:
                            tag = self.env['crm.etimad.tag.client'].sudo().search([('name', '=', category)], limit=1)
                            if not tag:
                                tag = self.env['crm.etimad.tag.client'].sudo().create({'name': category})
                            ids.append(tag.id)
                            record.tag_ids = [(6, 0, ids)]      
    @api.constrains('name')
    def _check_name(self):
        for record in self:
            if not record.name:
                raise ValidationError("The Name field cannot be empty.")
    
    
        return True
    def etimad_open_link(self):
            for record in self:
                dynamic_url = f"{record.link}"  
                return {
                        'type': 'ir.actions.act_url',
                        'url': dynamic_url,
                        'target': 'new', 
                }
    def _get_source(self):
            source =self.env['utm.source'].search([('name','=','Etimad')])
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
                    source_id = self.env['utm.source'].create({'name': "Etimad"})
                    lead_data = {
                        'name': record.name,
                        'description': record.category,
                        'type': 'opportunity',
                        'team_id': 1,
                        'source_id': source_id.id,
                        'referred': record.ref,
                        'partner_name': record.company,
                        'website': record.link,
                        'date_open': record.publish,
                        'date_closed': record.limit,
                        'date_deadline': record.limit
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
                        'description': record.category,
                        'type': 'opportunity',
                        'team_id': 1,
                        'source_id': self._get_source(),
                        'referred': record.ref,
                        'partner_name': record.company,
                        'website': record.link,
                        'date_open': record.publish,
                        'date_closed': record.limit,
                        'date_deadline': record.limit
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


    
   
