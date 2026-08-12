<?php

namespace App\Http\Requests\Course;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_id'   => ['required', 'integer', 'exists:departments,id'],
            'code'            => ['required', 'string', 'max:20'],
            'title_en'        => ['required', 'string', 'max:255'],
            'title_ar'        => ['nullable', 'string', 'max:255'],
            'credit_hours'    => ['required', 'integer', 'min:1', 'max:12'],
            'description'     => ['nullable', 'string'],
            'prerequisites'   => ['nullable', 'array'],
            'prerequisites.*' => ['integer', 'exists:courses,id'],
        ];
    }
}
