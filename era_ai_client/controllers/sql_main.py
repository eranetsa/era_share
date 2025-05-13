from odoo import http
from odoo.http import request

class SqlAIController(http.Controller):

    @http.route('/get_sql_samples', type='json', auth="user")
    def get_sql_samples(self):
        
        samples = request.env['sql.connector'].search([
            ('sql_description', '!=', False),
            ('response_report_file', '!=', False),
            ('state', '=', 'success'),
            ('active', '!=', False),
        ])

        # Use a dictionary to keep only the first occurrence of each unique sql_description
        unique_samples = {}
        for sample in samples:
            if sample.sql_description not in unique_samples:
                unique_samples[sample.sql_description] = sample

        # Convert the dictionary values into the required list format
        result = [{'id': sample.id, 'name': sample.sql_description} for sample in unique_samples.values()]

        return result
