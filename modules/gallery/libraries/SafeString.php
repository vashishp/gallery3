<?php defined("SYSPATH") or die("No direct script access.");
/**
 * Gallery - a web based photo album viewer and editor
 * Copyright (C) 2000-2009 Bharat Mediratta
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street - Fifth Floor, Boston, MA  02110-1301, USA.
 */

/**
 * Safe string representation (regarding security - cross site scripting).
 */
class SafeString_Core {
  private $_raw_string;
  protected $_is_safe_html = false;

  private static $_purifier = null;

  /** Constructor */
  function __construct($string) {
    if ($string instanceof SafeString) {
      $this->_is_safe_html = $string->_is_safe_html;
      $string = $string->unescaped();
    }
    $this->_raw_string = (string) $string;
  }

  /**
   * Factory method returning a new SafeString instance for the given string.
   */
  static function of($string) {
    return new SafeString($string);
  }

  /**
   * Marks this string as safe to be used in HTML without any escaping.
   */
  function mark_html_safe() {
    $this->_is_safe_html = true;
    return $this;
  }

  /**
   * Safe for use in HTML.
   * @see #for_html()
   */
  function __toString() {
    if ($this->_is_safe_html) {
      return $this->_raw_string;
    } else {
      return self::_escape_for_html($this->_raw_string);
    }
  }

  /**
   * Safe for use in HTML.
   *
   * Example:<pre>
   *   <div><?= $php_var ?> 
   * </pre>
   * @return the string escaped for use in HTML.
   */
  function for_html() {
    return $this;
  }

  /**
   * Safe for use in JavaScript.
   *
   * Example:<pre>
   *   <script type="text/javascript>"
   *     var some_js_var = "<?= $php_var->for_js() ?>";
   *   </script>
   * </pre>
   * @return the string escaped for use in JavaScript.
   */
  function for_js() {
    return self::_escape_for_js($this->_raw_string);
  }

  /**
   * Safe for use in HTML element attributes.
   *
   * Assumes that the HTML element attribute is already
   * delimited by single or double quotes
   *
   * Example:<pre>
   *     <a title="<?= $php_var->for_html_attr() ?>">;
   *   </script>
   * </pre>
   * @return the string escaped for use in HTML attributes.
   */
  function for_html_attr() {
    $string = (string) $this->for_html();
    return strtr($string,
		 array("'"=>"&#039;",
		       '"'=>'&quot;'));
  }

  /**
   * Safe for use HTML (purified HTML)
   *
   * Example:<pre>
   *   <div><?= $php_var->purified_html() ?> 
   * </pre>
   * @return the string escaped for use in HTML.
   */
  function purified_html() {
    if ($this->_is_safe_html) {
      return $this;
    } else {
      return SafeString::of(self::_purify_for_html($this->_raw_string), true);
    }
  }

  /**
   * Returns the raw, unsafe string. Do not use lightly.
   */
  function unescaped() {
    return $this->_raw_string;
  }

  // Escapes special HTML chars ("<", ">", "&", etc.) to HTML entities.
  private static function _escape_for_html($dirty_html) {
    return html::specialchars($dirty_html);
  }

  // Escapes special chars (quotes, backslash, etc.) with a backslash sequence.
  private static function _escape_for_js($string) {
    // From Smarty plugins/modifier.escape.php
    // Might want to be stricter here.
    return strtr($string,
		 array('\\'=>'\\\\',"'"=>"\\'",'"'=>'\\"',"\r"=>'\\r',"\n"=>'\\n','</'=>'<\/'));
  }

  // Purifies the string, removing any potentially malicious or unsafe HTML / JavaScript.
  private static function _purify_for_html($dirty_html) {
    if (empty(self::$_purifier)) {
      require_once(dirname(__file__) . "/../lib/HTMLPurifier/HTMLPurifier.auto.php");
      $config = HTMLPurifier_Config::createDefault();
      foreach (Kohana::config('purifier') as $category => $key_value) {
        foreach ($key_value as $key => $value) {
          $config->set("$category.$key", $value);
        }
      }
      self::$_purifier = new HTMLPurifier($config);
    }
    return self::$_purifier->purify($dirty_html);
  }
}