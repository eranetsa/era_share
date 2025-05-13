import ast
import base64
import logging
import json  # Add json for serialization
import uuid

import requests , time
from openai import OpenAI 
from pydantic import BaseModel
from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError
from odoo.tools.misc import formatLang, format_date as odoo_format_date, get_lang



_logger = logging.getLogger(__name__)

class TourConnector(models.Model):
    _name = "tour.connector"
    _description = "Tour Connector"


    name = fields.Char(string="Name", help="Add Tour Name.", translate=True)
    active = fields.Boolean(default=True)
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    tour_script = fields.Text(string="Tour Script", help="Add JavaScript code for the tour in JSON syntax.",
        )
    tour_steps = fields.Text(string="Tour Steps", help="Explain Steps the user follows to execute the tour.",
        )

    tour_mode = fields.Selection([('manual', 'Manual'),('auto', 'Automation')], default='manual')
    step_delay = fields.Integer(string="Step Delay", default=1500, readonly=True)
    pointer_duration = fields.Integer(string="Show Pointer Duration", default=1000, readonly=True)
    state = fields.Selection(selection=[('success','Success'), ('failed', 'Failed')], string='Execution state')

    def execute_tour(self):
        """
        Trigger the execution of the tour.
        Sends the tour script to the frontend .
        """
        self.ensure_one()
        return {
        'type': 'ir.actions.client',
        'tag': 'execute_custom_tour',
        'params': {
            'tour_name': self.name,
            'tour_mode': self.tour_mode,
            'pointer_duration': self.pointer_duration,
            'step_delay': self.step_delay,
            'tour_script': self.tour_script,  # Pass the tour script from the record
            'tour_connector': self.id
            },
        }

    def write(self, vals):
        #Compute session time out defualt 15 minutes from last user message
        for connector in self:
            if 'state' in vals :
                ai_call = '1'
                current_user = self.env.uid
                data = {'prompt': connector.name,
                    'tour_mode': connector.tour_mode,
                    'state': vals.get('state'),
                    }
                company = self.env.company
                openai_param = company._get_openai_param(ai_call)
                company.era_chat_with_ai(data, ai_call, current_user, openai_param)
        return super(TourConnector, self).write(vals)

    def fetch_failed(self, **kwargs):       
        """
            Get active user failed connector 
        """
        # Retrive active connector
        current_user = self.env.uid
        last_connector = self.env['tour.connector'].search([('id','!=', self.id),('name', '!=', False),
                ('create_uid', '=', current_user),('state','in',['failed',False])],
                    order='create_date desc', limit=1)
        if last_connector:
            self.name = last_connector.name
            self.tour_mode = last_connector.tour_mode
            last_connector.unlink()
            
    def chat_with_gpt(self, **kwargs): #replace get_chatgpt_response()
        self.ensure_one()
        # Handle try case 
        is_retry =  False
        if not self or not self.name:
            ## It's try ##
            is_retry = True
            self.fetch_failed()

        if not self or not self.name:
            raise UserError(_("Failed to generate the tour script no prompt added"))  

        ## Call AI ##
        ai_call = '1'
        current_user = self.env.uid
        data = {'prompt': self.name,
            'tour_mode': self.tour_mode}
        company = self.env.company
        openai_param = company._get_openai_param(ai_call)
        # Look for same previous success prompt
        response_data = self.find_previous_result()
        print(response_data,"============111111==response_data")
        if not response_data:
            response_data = company.era_chat_with_ai(data, ai_call, current_user, openai_param)
        
        print(response_data,"===================response_data")
        if isinstance(response_data, dict) and 'steps' in response_data:
            response_steps = response_data['steps']
            response_script = response_data['script']
            # Store the script and steps
            self.tour_steps = response_steps
            self.tour_script = response_script
            if is_retry and not self.name:
                self.unlink()
            _logger.info(f"Tour script generated successfully for prompt {self.name}.")
            return response_data
        else:
            if is_retry and not self.name:
                self.unlink()
            return company.show_popup(_('Error'), response_data)

    


    def find_previous_result(self, **kwargs): 
        """
        Look for the same prompt in db session and execute it 
        """    
        assistant_content = []
        connector_obj = self.env['tour.connector'].search([('state', '=', 'success'), ('id','!=', self.id)])  # Retrieve only one record
        if not connector_obj:
            connector_obj = self.env['tour.connector'].search([('state', '=', 'success')])
        for record in connector_obj:
            if  record.name.lower() == self.name.lower():
                assistant_content.append({'steps':record.tour_steps,
                    'script': record.tour_script})
                if len(assistant_content) == 1:
                    break;

        return assistant_content[0] if assistant_content else  assistant_content
    
