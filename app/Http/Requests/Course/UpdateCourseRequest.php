<?php

namespace App\Http\Requests\Course;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title_en'        => ['sometimes', 'string', 'max:255'],
            'title_ar'        => ['nullable', 'string', 'max:255'],
            'credit_hours'    => ['sometimes', 'integer', 'min:1', 'max:12'],
            'description'     => ['nullable', 'string'],
            'prerequisites'   => ['nullable', 'array'],
            'prerequisites.*' => ['integer', 'exists:courses,id'],
        ];
    }
}
