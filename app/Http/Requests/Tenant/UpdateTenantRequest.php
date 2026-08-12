<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'           => ['sometimes', 'string', 'max:255'],
            'locale'         => ['nullable', 'string', 'max:10'],
            'timezone'       => ['nullable', 'string', 'max:50'],
            'grading_system' => ['nullable', 'string', 'in:letter,gpa,percentage'],
            'settings'       => ['nullable', 'array'],
        ];
    }
}
