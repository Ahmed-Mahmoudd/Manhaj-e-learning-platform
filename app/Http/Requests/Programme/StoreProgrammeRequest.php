<?php

namespace App\Http\Requests\Programme;

use Illuminate\Foundation\Http\FormRequest;

class StoreProgrammeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_id'   => ['required', 'integer', 'exists:departments,id'],
            'name_en'         => ['required', 'string', 'max:255'],
            'name_ar'         => ['nullable', 'string', 'max:255'],
            'code'            => ['required', 'string', 'max:20'],
            'grading_type'    => ['required', 'string', 'in:credit_gpa,year_percentage'],
            'duration_years'  => ['required', 'integer', 'min:1', 'max:10'],
            'is_active'       => ['boolean'],
        ];
    }
}
