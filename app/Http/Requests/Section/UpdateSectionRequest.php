<?php

namespace App\Http\Requests\Section;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'instructor_id'  => ['sometimes', 'integer', 'exists:users,id'],
            'section_number' => ['sometimes', 'string', 'max:10'],
            'capacity'       => ['sometimes', 'integer', 'min:1', 'max:500'],
            'schedule'       => ['nullable', 'array'],
            'is_active'      => ['sometimes', 'boolean'],
        ];
    }
}
