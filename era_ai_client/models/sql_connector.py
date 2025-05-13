import ast
import base64
import logging
import json  # Add json for serialization
import io
import uuid

import xlsxwriter
import requests , time
import datetime
from openai import OpenAI 
from pydantic import BaseModel
from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError
from odoo.tools.misc import formatLang, format_date as odoo_format_date, get_lang



_logger = logging.getLogger(__name__)

class SQLConnector(models.Model):
    _name = "sql.connector"
    _description = "SQL Connector"


    # name = fields.Char(string="Report Name", help="Add Report Name.", translate=True)
    # sql_description = fields.Text(string="Description", help="Descripe the inquery you want to execute.")
    # sql_query = fields.Text(string="SQL Query", help="Query code for the SQL to execute.")
    # response_report_file = fields.Binary(string="Response Report File", readonly=True)
    # report_filename = fields.Char(string="Report Filename", readonly=True)
    # execution_message = fields.Char()
    # active = fields.Boolean(default=True)
    # company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    # state = fields.Selection(selection=[('success','Success'), ('failed', 'Failed')], string='Execution state')

    # def execute_query(self):
    #     """
    #     Trigger the execution of the SQL.
    #     Sends the SQL script to the frontend using a controller.
    #     """
    #     self.ensure_one()
    #     # Reset fields before execution
    #     self.write({
    #         'response_report_file': False,
    #         'report_filename': False,
    #         'execution_message': "",
    #     })
    #     if not self.name:
    #         self.name = _('AI Report')
    #     if not self.sql_query:
    #         self.chat_with_gpt()
    #     try:
    #         # Execute the SQL query
    #         self.env.cr.execute(self.sql_query)

    #         # Fetch data if available
    #         if self.env.cr.description:  # This ensures it's a SELECT query
    #             query_result = self.env.cr.fetchall()
    #             query_columns = [desc[0] for desc in self.env.cr.description]
    #             if query_result:  # Check if the result contains data
    #                 # Generate Excel file
    #                 output = io.BytesIO()
    #                 workbook = xlsxwriter.Workbook(output)
    #                 worksheet = workbook.add_worksheet('AI Result')

    #                 # Write column headers
    #                 for col_num, header in enumerate(query_columns):
    #                     worksheet.write(0, col_num, header)

    #                 # Write query results
    #                 for row_num, row_data in enumerate(query_result, start=1):
    #                     for col_num, cell_data in enumerate(row_data):
    #                         if isinstance(cell_data, datetime.date):
    #                             formatted_value = (
    #                                 cell_data.strftime('%Y-%m-%d %H:%M:%S') 
    #                                 if isinstance(cell_data, datetime.datetime) 
    #                                 else cell_data.strftime('%Y-%m-%d')
    #                             )
    #                             worksheet.write(row_num, col_num, formatted_value)
    #                         else:
    #                             worksheet.write(row_num, col_num, cell_data)

    #                 workbook.close()
    #                 output.seek(0)
    #                 report_data = base64.b64encode(output.read())
    #                 output.close()

    #                 self.write({
    #                     'response_report_file': report_data,
    #                     'report_filename': f"{self.name}.xlsx",
    #                     'execution_message': _("%s executed successfully. Download the report." % (self.name)),
    #                 })
    #             else:
    #                 self.write({
    #                     'execution_message': _("%s executed successfully. No data to display in the report." % (self.name)),
    #                 })
    #         else:
    #             self.write({
    #                 'execution_message': _("%s executed successfully. No data to display." % (self.name)),
    #             })

    #         self.state = 'success'
    #         return {
    #         'context': {
    #             'execution_message': self.execution_message,
    #             'response_report_file': self.response_report_file,
    #             'report_name': self.name
    #             }
    #         }

    #     except Exception as e:            
    #         # Log the error
    #         self.write({
    #             'execution_message': _(f"Error occurred: {str(e)}"),
    #             'state': 'failed'
    #         })
                        
    #         # raise UserError(_(f"Error occurred: {str(e)}"))
    #         return {
    #         'context': {
    #             'execution_message': self.execution_message,
    #                 }
    #             }

    # def write(self, vals):
    #     #Compute session time out defualt 15 minutes from last user message
    #     for session in self:
    #         if 'state' in vals :
    #             ai_call = '2'
    #             current_user = self.env.uid
    #             data = {'prompt': self.name,
    #                     'sql_description': self.sql_description,
    #                     'state': vals.get('state'),
    #                     'msg': vals.get('execution_message') if 'execution_message' in vals else self.execution_message 
    #                     }
    #             company = self.env.company
    #             openai_param = company._get_openai_param(ai_call)
    #             company.era_chat_with_ai(data, ai_call, current_user, openai_param)
    #     return super(SQLConnector, self).write(vals)

    # def fetch_failed(self, **kwargs):       
    #     """
    #     Get active user failed connector 
    #     """
    #     # Retrive active connector 
    #     current_user = self.env.uid        
    #     last_connector = self.env['sql.connector'].search([('id','!=', self.id),('sql_description', '!=', False),
    #             ('create_uid', '=', current_user),('state','in',['failed',False])],
    #                 order='create_date desc', limit=1)
    #     if last_connector :
    #         if not self.sql_description:
    #             self.sql_description = last_connector.sql_description
    #             self.name = last_connector.name
    #             last_connector.unlink()

    # def chat_with_gpt(self, **kwargs): #replace get_chatgpt_response()
    #     self.ensure_one()
        
    #     # Handel try case
    #     is_retry = False
    #     if not self or not self.sql_description:
    #         ## It's try
    #         is_retry = True
    #         self.fetch_failed()
    #     if not self or not self.sql_description:
    #         raise UserError(_("Failed to generate the SQL script no prompt added"))  

    #     ## Call AI ##
    #     ai_call = '2'
    #     current_user = self.env.uid
    #     data = {'prompt': self.name,
    #             'sql_description': self.sql_description}
    #     company = self.env.company
    #     openai_param = company._get_openai_param(ai_call)
    #     response_data = company.era_chat_with_ai(data, ai_call, current_user, openai_param)

    #     if isinstance(response_data, dict) and 'sql_query' in response_data:
    #         response_query = response_data['sql_query']
    #         # Store the query
    #         self.sql_query = response_query
    #         if not self.name:
    #             self.name = self.sql_description
    #         if is_retry and not self.name:
    #             self.unlink()
    #         _logger.info(f"Sql script generated successfully for prompt {self.name}.")
    #         return response_data
    #     else:
    #         if is_retry and not self.name:
    #             self.unlink()
    #     return company.show_popup(_('Error'), response_data)

    # 