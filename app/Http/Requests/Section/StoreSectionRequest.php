<?php

namespace App\Http\Requests\Section;

use Illuminate\Foundation\Http\FormRequest;

class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'course_id'        => ['required', 'integer', 'exists:courses,id'],
            'academic_term_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'instructor_id'    => ['required', 'integer', 'exists:users,id'],
            'section_number'   => ['required', 'string', 'max:10'],
            'capacity'         => ['required', 'integer', 'min:1', 'max:500'],
            'schedule'         => ['nullable', 'array'],
            'is_active'        => ['boolean'],
        ];
    }
}
