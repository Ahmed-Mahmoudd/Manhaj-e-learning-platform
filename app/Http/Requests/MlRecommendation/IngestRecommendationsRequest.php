<?php

namespace App\Http\Requests\MlRecommendation;

use Illuminate\Foundation\Http\FormRequest;

class IngestRecommendationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id'                      => ['required', 'integer', 'exists:tenants,id'],
            'recommendations'                => ['required', 'array', 'min:1', 'max:500'],
            'recommendations.*.student_id'   => ['required', 'integer', 'exists:users,id'],
            'recommendations.*.course_id'    => ['required', 'integer', 'exists:courses,id'],
            'recommendations.*.score'        => ['required', 'numeric', 'min:0', 'max:1'],
            'recommendations.*.reason'       => ['nullable', 'string', 'max:500'],
        ];
    }
}
