# -*- coding: utf-8 -*-
# Copyright (C) 2022 - Michel Perrocheau (https://github.com/myrrkel).
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).
import requests
import os
import logging
import json
from odoo.exceptions import AccessError, ValidationError, UserError
from odoo import api, fields, models, _
from odoo.http import request
from odoo import http


_logger = logging.getLogger(__name__)

class ResCompany(models.Model):
    _inherit = "res.company"

    openai_api_key = fields.Char(string="AI API Key")
    max_tokens = fields.Integer(default=2000, help='''An upper bound for the number of tokens that can be generated 
                                            for a completion, including visible output tokens and reasoning tokens.
                                        ''')
    schema_instructions = fields.Char(string="db schema")  # Stores the sb schema
    schema_last_update = fields.Datetime()

    def _get_client_schema(self):
        #Compute db schema time out defualt 60 days  from last update
        for rec in self:
            schema = self.env.company.schema_instructions
            timeout = 60 * 60 * 24 * 60   ### 60 days ###
            schema = ''
            if schema:
                is_timeout = (fields.Datetime.now() - self.env.company.schema_last_update).total_seconds() > timeout
                if is_timeout:
                    schema = self._initialize_client_schema()
                    self.env.company.schema_instructions = schema
                    self.env.company.schema_last_update = fields.Datetime.now()
            else:
                schema = self._initialize_client_schema()
                self.env.company.schema_instructions = schema
                self.env.company.schema_last_update = fields.Datetime.now()

    def show_popup(self, title, message, sticky=True, type='danger'):
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _(title),
                'message': _(message),
                'type': type,
                'sticky': sticky,
                'next': {
                    'type': 'ir.actions.act_window_close'
                }
            }
        }

    def _get_openai_param(self, ai_call):
        """Get request parameter from the chatgpt config."""
        company = self.env.company

        openai_key = company.openai_api_key
        max_tokens = company.max_tokens
        
        # Get db schema
        schema = ''
        if ai_call=='2':
            self._get_client_schema()
            schema = company.schema_instructions
        openai_params = {
                "max_tokens": max_tokens,
                "openai_key": openai_key,
                "client_schema": schema
            }
        
        return openai_params

    def era_chat_with_ai(self, data, ai_call, current_user, openai_params):
        url = 'https://service.era.net.sa/ai/call'

        request = http.request if hasattr(http, 'request') else None
        server_domain = request.httprequest.host_url if request else None
        if not server_domain:
            server_domain = os.getenv('ODOO_SERVER_DOMAIN', 'default.domain.com')
        params = {
            'data': data,
            'ai_call': ai_call,
            'current_user': current_user,
            'openai_params': openai_params,
            'client_domain': server_domain,
        }
        _logger.info('Domain: %s', params['client_domain'])

        payload = json.dumps({
            'jsonrpc': '2.0',
            'params': params
        })
        headers = {
            'Content-Type': 'application/json',
        }

        response = requests.post(url, headers=headers, data=payload ,timeout=120)
        _logger.info('AI service response: %s', response)
        
        if response.status_code == 200:
            result = response.json()
            print(result,"==============result")
            if result.get('error'):
                _logger.info('error result: %s', result)
                _logger.info('error: %s', result.get('error'))

                raise ValidationError(_('Service error: %s', result.get('error').get('data').get('debug')))

            elif result.get('result'):
                response=result.get('result')
                if isinstance(response, dict) and 'error' in response:
                    raise ValidationError(_('Service error: %s', response.get('error')))

                _logger.info('Success result: %s', result)
                _logger.info('Success result: %s', response)

                return response
        else:
            _logger.error('Failed to call AI service, status code: %s, response: %s', response.status_code,

                          response.text)
            if response.status_code == 500:
                raise ValidationError(_('Failed to call AI service'))

            if response.status_code == 403:
                raise ValidationError(_('Please check your subscription with Era Group  info@era.net.sa'))


            return {
                'status': _('error'),
                'message': _('Failed to call AI service')
            }
        
    def _initialize_client_schema(self):
        """Get client schema to set as default instructions."""
        # SQL query to extract schema information
        schema_query = """
            WITH schema_tables AS (
                SELECT 'Table: ' || table_name AS info
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name NOT LIKE '%_rel'
                AND table_name NOT LIKE '%_m2m'
                -- Exclude unwanted table prefixes
                AND table_name NOT LIKE 'base_%'
                AND table_name NOT LIKE 'web_%'
                AND table_name NOT LIKE 'discuss_%'
                AND table_name NOT LIKE 'email_%'
                AND table_name NOT LIKE 'ir_%'
                AND table_name NOT LIKE 'mail_%'
                AND table_name NOT LIKE 'wizard_%'
                ORDER BY table_name
            ),
            schema_columns AS (
                SELECT '  Column: ' || table_name || '.' || column_name || 
                       ' (' || data_type || ')' || 
                       CASE WHEN is_nullable = 'YES' THEN ' [NULLABLE]' ELSE '' END AS info
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name NOT LIKE '%_rel'
                AND table_name NOT LIKE '%_m2m'
                -- Exclude unwanted table prefixes
                AND table_name NOT LIKE 'base_%'
                AND table_name NOT LIKE 'web_%'
                AND table_name NOT LIKE 'discuss_%'
                AND table_name NOT LIKE 'email_%'
                AND table_name NOT LIKE 'ir_%'
                AND table_name NOT LIKE 'mail_%'
                AND table_name NOT LIKE 'wizard_%'
            
                ORDER BY table_name, ordinal_position
            )
           
            SELECT info
            FROM (
                SELECT * FROM schema_tables
                UNION ALL
                SELECT * FROM schema_columns
                
            ) AS schema_info
            ORDER BY info;
        """

        try:
            
            # Execute the schema query
            self.env.cr.execute(schema_query)
            
            # Fetch all results and concatenate them into a single string
            schema_result = "\n".join(row[0] for row in self.env.cr.fetchall())

            return str(schema_result)
        except Exception as e:
            print("Error:", e)