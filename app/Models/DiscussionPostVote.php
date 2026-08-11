<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscussionPostVote extends Model
{
    public $timestamps = false;

    protected $fillable = ['post_id', 'user_id', 'voted_at'];

    protected function casts(): array
    {
        return ['voted_at' => 'datetime'];
    }

    public function post(): BelongsTo { return $this->belongsTo(DiscussionPost::class, 'post_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
