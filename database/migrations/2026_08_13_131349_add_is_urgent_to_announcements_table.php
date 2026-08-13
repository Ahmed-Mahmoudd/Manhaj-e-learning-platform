<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->boolean('is_urgent')->default(false)->after('type');
        });

        // Migrate legacy records that stored urgency as a type value.
        DB::table('announcements')
            ->where('type', 'urgent')
            ->update([
                'is_urgent' => true,
                'type'      => 'general',
            ]);
    }

    public function down(): void
    {
        DB::table('announcements')
            ->where('is_urgent', true)
            ->update(['type' => 'urgent']);

        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn('is_urgent');
        });
    }
};
