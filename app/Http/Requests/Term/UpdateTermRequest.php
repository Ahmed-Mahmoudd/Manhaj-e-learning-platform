<?php

namespace App\Http\Requests\Term;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTermRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => ['sometimes', 'string', 'max:100'],
            'type'       => ['sometimes', 'string', 'in:semester,quarter,trimester,summer'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at'   => ['sometimes', 'date', 'after:starts_at'],
        ];
    }
}
