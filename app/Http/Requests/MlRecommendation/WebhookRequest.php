<?php

namespace App\Http\Requests\MlRecommendation;

use Illuminate\Foundation\Http\FormRequest;

class WebhookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event'   => ['required', 'string', 'max:100'],
            'payload' => ['nullable', 'array'],
        ];
    }
}
