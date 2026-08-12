<?php

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'faculty_id' => ['required', 'integer', 'exists:faculties,id'],
            'name_en'    => ['required', 'string', 'max:255'],
            'name_ar'    => ['nullable', 'string', 'max:255'],
            'code'       => ['required', 'string', 'max:20'],
        ];
    }
}
