<?php

namespace App\Http\Requests\Programme;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProgrammeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name_en'        => ['sometimes', 'string', 'max:255'],
            'name_ar'        => ['nullable', 'string', 'max:255'],
            'code'           => ['sometimes', 'string', 'max:20'],
            'grading_type'   => ['sometimes', 'string', 'in:credit_gpa,year_percentage'],
            'duration_years' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'is_active'      => ['boolean'],
        ];
    }
}
