from odoo import http
from odoo.http import request

class TourAIController(http.Controller):

    @http.route('/get_tour_samples', type='json', auth="user")
    def get_tour_samples(self):

        samples = request.env['tour.connector'].search([
            ('name', '!=', False),
            ('state', '=', 'success'),
            ('active', '!=', False),
        ])

        # Use a dictionary to keep only the first occurrence of each unique name
        unique_samples = {}
        for sample in samples:
            if sample.name not in unique_samples:
                unique_samples[sample.name] = sample

        # Convert the dictionary values into the required list format
        result = [{'id': sample.id, 'name': sample.name} for sample in unique_samples.values()]

        return result
