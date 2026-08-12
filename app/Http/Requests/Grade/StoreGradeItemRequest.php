<?php

namespace App\Http\Requests\Grade;

use App\Models\GradeItem;
use Illuminate\Foundation\Http\FormRequest;

class StoreGradeItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:255'],
            'type'      => ['required', 'string', 'in:' . implode(',', GradeItem::TYPES)],
            'max_score' => ['required', 'numeric', 'min:1', 'max:9999'],
            'weight'    => ['nullable', 'numeric', 'min:0', 'max:100'],
            'due_at'    => ['nullable', 'date'],
            'order'     => ['nullable', 'integer', 'min:0'],
        ];
    }
}
